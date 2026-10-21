import { formatMonth, getExperience, getPosts, getProjects, getSite, getSkills } from "./content";
import { EMBED_MODEL, MIN_SCORE, denseSearch, syncIfChanged, vectorSearchEnabled, type DenseHit } from "./vector-store";

/**
 * One retrievable passage. Every chunk comes from exactly one source file and never mixes content
 * from two projects or posts. `source` names that origin; `project` is the project it's about
 * (a project's own sections, and posts linked to it via `project:` in their front matter), which
 * lets the agent scope a search to a single project.
 */
export type Chunk = { id: string; title: string; href: string; text: string; source: string; project?: string };

const strip = (md: string) =>
  md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\|/g, " ")
    .replace(/[#*_`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Splits markdown on "## " headings into chunks of a reasonable size. */
function sections(md: string) {
  const out: Array<{ heading: string; body: string }> = [];
  let cur = { heading: "", body: "" };
  for (const line of md.split("\n")) {
    const m = /^##\s+(.*)/.exec(line);
    if (m) {
      if (cur.body.trim()) out.push(cur);
      cur = { heading: m[1].trim(), body: "" };
    } else cur.body += line + "\n";
  }
  if (cur.body.trim()) out.push(cur);
  return out;
}

const TYPE_LABEL: Record<string, string> = { "ai-engineering": "AI engineering", "full-stack": "Full-stack" };

let cache: Chunk[] | null = null;

/** Everything the chat agent may answer from — built from the same content files as the pages. */
export function buildIndex(): Chunk[] {
  if (cache) return cache;
  const site = getSite();
  const chunks: Chunk[] = [];
  chunks.push({ id: "profile", source: "profile", title: "Profile", href: "/", text: `${site.name} — ${site.jobTitle}, based in ${site.location}. ${site.description} ${site.availability}.` });
  chunks.push({ id: "miso", source: "profile", title: "Miso, his cat", href: "/", text: `${site.photo.alt}. The cat is Miso, a Ragdoll, who is also the assistant in this chat.` });
  chunks.push({ id: "contact", source: "profile", title: "Contact", href: `mailto:${site.email}`, text: `Email ${site.email}. GitHub ${site.socials.github}. LinkedIn ${site.socials.linkedin}. Based in ${site.location}, open to remote work.` });

  for (const p of getProjects()) {
    const href = p.caseStudy ? `/projects/${p.slug}` : "/#work";
    const links = [p.links.demo && `Live demo: ${p.links.demo}.`, p.links.github && `Code: ${p.links.github}.`].filter(Boolean).join(" ");
    const where = p.status.startsWith("At ") ? ` Built ${p.status.replace("At", "at")}.` : "";
    const source = `project:${p.slug}`;
    const kind = p.types.map((t) => TYPE_LABEL[t] ?? t).join(" and ");
    chunks.push({ id: p.slug, source, project: p.slug, title: p.title, href, text: `${p.title} (${p.status}).${where} ${kind} project${p.product ? ", a product" : ""}. ${p.summary} ${p.description} Stack: ${p.stack.join(", ")}. ${links}` });
    sections(p.body).forEach((s, i) => {
      const text = strip(s.body);
      if (text.length > 40) chunks.push({ id: `${p.slug}-${i}`, source, project: p.slug, title: `${p.title.split(" — ")[0]}${s.heading ? `: ${s.heading}` : ""}`, href, text: `${where.trim()} ${text}`.trim() });
    });
  }
  // One catalogue chunk, so list-style questions ("which full-stack projects has he built?") see every
  // project at once; no single section names them all.
  const projects = getProjects();
  chunks.push({
    id: "projects-overview",
    source: "overview",
    title: "All projects",
    href: "/#work",
    text: `${projects.length} projects: ` + projects.map((p) => `${p.title} — ${p.types.map((t) => TYPE_LABEL[t] ?? t).join(" and ")}${p.product ? ", product" : ""}, ${p.status}. ${p.summary}`).join(" "),
  });
  for (const post of getPosts()) {
    sections(post.body).forEach((s, i) => {
      const text = strip(s.body);
      if (text.length > 40) chunks.push({ id: `post-${post.slug}-${i}`, source: `post:${post.slug}`, project: post.project, title: `${post.title}${s.heading ? `: ${s.heading}` : ""}`, href: `/blog/${post.slug}`, text });
    });
  }
  for (const j of getExperience()) {
    const id = `job-${j.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`;
    const when = `${formatMonth(j.start)} to ${formatMonth(j.end)}`;
    const body = j.highlights ? j.highlights.map((h) => `${h.title} ${h.text}`).join(" ") : j.summary ?? "";
    chunks.push({ id, source: "experience", title: `${j.company} (${j.role})`, href: "/#experience", text: `${j.company}, ${j.role}, ${when}. ${j.context ?? ""} ${body}` });
  }
  for (const g of getSkills()) {
    chunks.push({
      id: `skills-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      source: "skills",
      title: `Skills: ${g.title}`,
      href: "/#skills",
      text: g.items.map((i) => `${i.name}: ${i.used}`).join(" "),
    });
  }
  // Dev rebuilds on every call (it's cheap) so content edits reach the chat without a restart.
  if (process.env.NODE_ENV === "production") cache = chunks;
  return chunks;
}

const STOP = new Set("the a an and or of to in on for is are his he what does did with how has have me about tell any do i you can chiranjeev his him who which when where does know built build work working".split(" "));
/** Light stemmer: enough to match "LLMs"→"llm", "reranking"→"rerank", "agents"→"agent". */
const stem = (w: string) =>
  w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y"
  : w.length > 5 && w.endsWith("ing") ? w.slice(0, -3)
  : w.length > 4 && w.endsWith("ed") ? w.slice(0, -2)
  : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1)
  : w;
/** Recruiter phrasings mapped onto words the content actually uses. */
const SYNONYMS: Record<string, string[]> = {
  now: ["present"], current: ["present"], currently: ["present"], today: ["present"],
  job: ["role"], employer: ["role"], company: ["role"], worked: ["role"],
  reach: ["email"], contact: ["email"], hire: ["email", "open"],
};
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").replace(/\.+(\s|$)/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
const tokenize = (s: string) => words(s).map(stem);
const queryTerms = (q: string) => words(q).flatMap((w) => [w, ...(SYNONYMS[w] ?? [])]).map(stem);

/** BM25 keyword search over the index. Small corpus, so this runs in well under a millisecond. */
export function keywordSearch(query: string, k = 4, project?: string): Chunk[] {
  const all = buildIndex();
  const docs = project ? all.filter((d) => d.project === project) : all;
  if (!docs.length) return [];
  const terms = Array.from(new Set(queryTerms(query)));
  if (!terms.length) return [];
  const toks = docs.map((d) => tokenize(`${d.title} ${d.title} ${d.title} ${d.text}`));
  const avg = toks.reduce((n, t) => n + t.length, 0) / toks.length;
  const N = docs.length;
  const scores = docs.map((d, i) => {
    let s = 0;
    for (const t of terms) {
      const tf = toks[i].filter((w) => w === t || (t.length > 4 && w.startsWith(t))).length;
      if (!tf) continue;
      const df = toks.filter((x) => x.some((w) => w === t || (t.length > 4 && w.startsWith(t)))).length;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (toks[i].length / avg))));
    }
    return { d, s };
  });
  return scores.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.d);
}

/** Reciprocal rank fusion: rewards chunks ranked high by either list, most of all by both. */
export function fuse(lists: Array<Array<{ id: string }>>, k: number, c = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((x, rank) => score.set(x.id, (score.get(x.id) ?? 0) + 1 / (c + rank + 1)));
  return Array.from(score.entries()).sort((a, b) => b[1] - a[1]).slice(0, k).map(([id]) => id);
}

/** One stage of a search, shown in the chat's agent trace. */
export type SearchStep = { label: string; detail: string };
type Dense = (q: string, n: number, project?: string) => Promise<DenseHit[]>;

const short = (t: string) => (t.length > 44 ? t.slice(0, 43).trimEnd() + "…" : t);
const list = (xs: Array<{ title: string }>, n = 3) => xs.slice(0, n).map((x) => short(x.title)).join(", ") + (xs.length > n ? ` +${xs.length - n}` : "");

/**
 * Hybrid search: meaning (Pinecone embeddings) fused with keyword relevance (BM25 above), returning
 * each stage for the agent trace. Without a Pinecone key, or if Pinecone is unreachable, it uses
 * keyword search alone so the chat keeps working.
 */
export async function searchWithTrace(query: string, k = 4, dense: Dense = denseSearch, project?: string): Promise<{ chunks: Chunk[]; steps: SearchStep[] }> {
  const docs = buildIndex();
  const keyword = keywordSearch(query, 10, project);
  const steps: SearchStep[] = [];
  const scope = project ? ` · only ${project}` : "";
  const keywordStep = { label: "Keyword search · BM25", detail: keyword.length ? `${keyword.length} matches${scope} · ${list(keyword)}` : `no shared words${scope}` };

  if (dense === denseSearch && !vectorSearchEnabled()) {
    steps.push({ label: "Meaning search skipped", detail: "no PINECONE_API_KEY · keyword only" }, keywordStep);
    return { chunks: keyword.slice(0, k), steps };
  }
  try {
    if (dense === denseSearch && process.env.NODE_ENV !== "production") await syncIfChanged(docs);
    const semantic = await dense(query, 10, project);
    steps.push({
      label: `Meaning search · Pinecone ${EMBED_MODEL}`,
      detail: semantic.length
        ? `${semantic.length} matches${scope} · ${semantic.slice(0, 3).map((h) => `${short(h.title)} ${h.score.toFixed(2)}`).join(", ")}`
        : `nothing above ${MIN_SCORE} similarity${scope}`,
    }, keywordStep);
    const byId = new Map<string, Chunk>(docs.map((d) => [d.id, d]));
    // Prefer the local chunk; fall back to Pinecone's copy (e.g. a record from a newer deploy).
    semantic.forEach((h) => byId.has(h.id) || byId.set(h.id, { id: h.id, source: h.source, project: h.project, title: h.title, href: h.href, text: h.text }));
    const chunks = fuse([semantic, keyword], k).map((id) => byId.get(id)!).filter(Boolean);
    const both = chunks.filter((c) => semantic.some((h) => h.id === c.id) && keyword.some((h) => h.id === c.id)).length;
    steps.push({ label: "Merged · reciprocal rank fusion", detail: chunks.length ? `top ${chunks.length}${both ? ` (${both} found by both)` : ""} · ${list(chunks, 4)}` : "no results" });
    return { chunks, steps };
  } catch (err) {
    console.warn("[search] Pinecone unavailable, using keyword search:", (err as Error).message);
    steps.push({ label: "Meaning search unavailable", detail: `${short((err as Error).message)} · keyword only` }, keywordStep);
    return { chunks: keyword.slice(0, k), steps };
  }
}

export async function search(query: string, k = 4, dense: Dense = denseSearch, project?: string): Promise<Chunk[]> {
  return (await searchWithTrace(query, k, dense, project)).chunks;
}
