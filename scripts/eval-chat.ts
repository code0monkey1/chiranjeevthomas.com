/**
 * Chat evals. Run with `npm run eval:chat`.
 * 1. Retrieval: each question must retrieve a chunk from the expected page (keyword search, or hybrid with a Pinecone key).
 * 2. Vector sync (fake Pinecone): only new/changed chunks are upserted, deleted chunks are removed.
 * 3. Hybrid fusion (fake dense results): a chunk found only by meaning still reaches the top results.
 * 4. Agent loop (mocked model): tool call → answer with citations → only retrieved ids survive.
 * 5. Live (optional): with PINECONE_API_KEY, paraphrased questions must hit by meaning;
 *    with GROQ_API_KEY, asks the real model and checks answers are grounded.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { buildIndex, fuse, keywordSearch, search } from "../lib/search-index";
import { FALLBACK_MODEL, MAX_SEARCHES, finalize, runAgent } from "../lib/agent";
import { denseSearch, syncRecords, vectorSearchEnabled, type VectorNamespace } from "../lib/vector-store";

const CASES: Array<[string, string[]]> = [
  ["How does InvoiceChaser keep a human in the loop?", ["/projects/invoicechaser"]],
  ["What did he build at Grabbit with LLMs?", ["/projects/grabbit-llm-search"]],
  ["Has he built a RAG pipeline with reranking?", ["/projects/agentic-rag"]],
  ["Where does he work now?", ["/#experience"]],
  ["How can I contact him?", ["mailto:"]],
  ["Does he know LangGraph?", ["/#skills", "/projects/invoicechaser"]],
];
// Paraphrases with almost no word overlap: keyword search misses these, embeddings must find them.
const SEMANTIC_CASES: Array<[string, string[]]> = [
  ["How does he keep tabs on what an AI is doing behind the scenes?", ["/projects/agent-observability"]],
  ["Does he understand meaning-based retrieval?", ["/projects/agentic-rag"]],
];

/** In-memory stand-in for a Pinecone namespace that records what was sent. */
function fakeNamespace() {
  const store = new Map<string, Record<string, string>>();
  const log = { upserted: 0, deleted: 0 };
  const ns: VectorNamespace = {
    async listPaginated() { return { vectors: Array.from(store.keys()).map((id) => ({ id })) }; },
    async fetch({ ids }) { return { records: Object.fromEntries(ids.filter((id) => store.has(id)).map((id) => [id, { metadata: store.get(id) }])) }; },
    async upsertRecords({ records }) { records.forEach((r) => store.set(r.id, r)); log.upserted += records.length; },
    async deleteMany({ ids }) { ids.forEach((id) => store.delete(id)); log.deleted += ids.length; },
    async searchRecords() { return { result: { hits: [] } }; },
  };
  return { ns, store, log };
}

let fail = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? "✓" : "✗"} ${msg}`); if (!ok) fail++; };

async function main() {
const hits4 = async (q: string, hrefs: string[]) => {
  const hits = await search(q, 4);
  check(hits.some((h) => hrefs.some((href) => h.href.startsWith(href))), `${q} → ${hrefs.join(" | ")}  [${hits.map((h) => h.id).join(", ")}]`);
};
console.log(`Retrieval (${vectorSearchEnabled() ? "hybrid: Pinecone + keyword" : "keyword only, no PINECONE_API_KEY"})`);
for (const [q, hrefs] of CASES) await hits4(q, hrefs);

console.log("\nVector sync (fake Pinecone)");
const docs = buildIndex();
const fake = fakeNamespace();
let sync = await syncRecords(docs, fake.ns);
check(sync.upserted === docs.length && fake.store.size === docs.length, `first sync upserts every chunk (${sync.upserted}/${docs.length})`);
check(Object.values(fake.store.get(docs[0].id)!).every((v) => typeof v === "string") && !!fake.store.get(docs[0].id)!.content, "records carry the text to embed in `content`");
sync = await syncRecords(docs, fake.ns);
check(sync.upserted === 0 && sync.deleted === 0, "re-sync with no changes sends nothing (no embedding tokens spent)");
const edited = docs.map((d, i) => (i === 0 ? { ...d, text: d.text + " Newly added detail." } : d)).slice(0, -1);
sync = await syncRecords(edited, fake.ns);
check(sync.upserted === 1 && sync.deleted === 1, `edit one chunk + remove one → 1 upserted, 1 deleted (got ${sync.upserted}, ${sync.deleted})`);

console.log("\nChunk boundaries");
const ids = new Set(docs.map((d) => d.id));
check(ids.size === docs.length, `chunk ids are unique (${docs.length})`);
check(docs.every((d) => /^(project:|post:)[a-z0-9-]+$|^(experience|skills|profile|overview)$/.test(d.source)), "every chunk has exactly one source");
const projectSlugs = new Set(docs.filter((d) => d.source.startsWith("project:")).map((d) => d.project));
check(docs.filter((d) => d.source.startsWith("project:")).every((d) => d.source === `project:${d.project}` && d.href.endsWith(d.project!) === (d.href !== "/#work")), "project chunks belong to their own project and link to its page");
check(docs.filter((d) => d.project).every((d) => projectSlugs.has(d.project)), "posts point only at projects that exist");
const scoped = keywordSearch("tracing evals tool gating approval", 10, "invoicechaser");
check(scoped.length > 0 && scoped.every((d) => d.project === "invoicechaser"), `scoped search stays inside one project [${scoped.map((d) => d.id).join(", ")}]`);
check(scoped.some((d) => d.source.startsWith("post:")), "scoped search includes posts written about that project");

console.log("\nHybrid fusion (fake dense results)");
const obs = docs.find((d) => d.href === "/projects/agent-observability")!;
const meaningOnly = async () => [{ id: obs.id, score: 0.9, title: obs.title, href: obs.href, text: obs.text, source: obs.source, project: obs.project }];
const fused = await search("How does he keep tabs on what an AI is doing behind the scenes?", 4, meaningOnly);
check(fused.some((h) => h.id === obs.id), `chunk found only by meaning makes the top 4 [${fused.map((h) => h.id).join(", ")}]`);
check(fuse([[{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }]], 3)[0] === "b", "chunk ranked by both lists wins");
const failing = async () => { throw new Error("pinecone down"); };
check((await search("Where does he work now?", 4, failing)).length > 0, "Pinecone error falls back to keyword results");
check(!keywordSearch(SEMANTIC_CASES[0][0], 4).some((h) => h.href === obs.href), "keyword search alone misses the paraphrase (why embeddings are needed)");

console.log("\nAgent loop (mocked model)");
let call = 0;
const mock: typeof fetch = async () => {
  call++;
  const message = call === 1
    ? { role: "assistant", content: null, tool_calls: [{ id: "t1", type: "function", function: { name: "search_portfolio", arguments: JSON.stringify({ query: "InvoiceChaser human approval" }) } }] }
    : { role: "assistant", content: "He pauses the agent before anything is sent. [invoicechaser] [made-up-id]" };
  return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
};
const r = await runAgent("How does InvoiceChaser keep a human in the loop?", [], "test-key", mock);
check(r.mode === "live" && r.trace.some((s) => s.kind === "tool"), "tool was called and traced");
check(!r.answer.includes("["), "citation markers stripped from answer");
check(finalize("Not covered here. [ ]", new Map()).answer === "Not covered here.", "empty citation brackets are removed");
check(finalize("**DevReferral** is full-stack.\n* React\n## Stack [devreferral]", new Map()).answer === "DevReferral is full-stack.\n- React\nStack", "Markdown emphasis, bullets and headings become plain text");
check(r.sources.every((s) => s.href.startsWith("/")), "sources only from retrieved chunks (fabricated id dropped)");

// Streaming: a tool call split across SSE chunks is reassembled, and answer tokens are forwarded as they arrive.
const sse = (chunks: object[]) => new Response(chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
let round = 0;
const streaming: typeof fetch = async () => {
  round++;
  if (round === 1) return sse([
    { choices: [{ delta: { tool_calls: [{ index: 0, id: "t1", function: { name: "search_portfolio", arguments: '{"query": "Invoice' } }] } }] },
    { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'Chaser approval"}' } }] } }] },
  ]);
  return sse(["He ", "pauses ", "for approval. ", "[invoicechaser]"].map((t) => ({ choices: [{ delta: { content: t } }] })));
};
const tokens: string[] = [];
const liveSteps: string[] = [];
const st = await runAgent("How does InvoiceChaser keep a human in the loop?", [], "test-key", streaming, { token: (t) => tokens.push(t), step: (s) => liveSteps.push(s.kind) });
check(st.trace.some((s) => s.label.includes('search_portfolio("InvoiceChaser approval"')), "streamed tool-call fragments reassemble into one search");
check(tokens.length === 4 && st.answer === "He pauses for approval." && st.sources.some((s) => s.href.includes("invoicechaser")), `answer tokens stream live (${tokens.length}) and the final answer is cleaned and cited`);
check(liveSteps[0] === "think" && liveSteps.includes("tool") && liveSteps.at(-1) === "done", "trace steps are emitted as they happen");

// An answer that cites nothing gets no source links, even if the search returned chunks
// (regression: "can I get his resume?" retrieved InvoiceChaser's "runs resume" text and linked it).
let nr = 0;
const noCite: typeof fetch = async () => {
  nr++;
  const message = nr === 1
    ? { role: "assistant", content: null, tool_calls: [{ id: "r1", type: "function", function: { name: "search_portfolio", arguments: JSON.stringify({ query: "resume" }) } }] }
    : { role: "assistant", content: "The portfolio does not contain a downloadable resume. Please email chiranjeevwork@gmail.com." };
  return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
};
const rr = await runAgent("can i get his resume?", [], "test-key", noCite);
check(rr.sources.length === 0 && !rr.grounded, `"not covered" answer shows no sources and isn't marked grounded (sources: ${rr.sources.map((s) => s.title).join(", ") || "none"})`);
// ...but a confident answer that forgot its citation ids still links what was retrieved.
let nc = 0;
const forgot: typeof fetch = async () => {
  nc++;
  const message = nc === 1
    ? { role: "assistant", content: null, tool_calls: [{ id: "f1", type: "function", function: { name: "search_portfolio", arguments: JSON.stringify({ query: "InvoiceChaser human approval" }) } }] }
    : { role: "assistant", content: "Every draft pauses for the freelancer's approval before it is sent." };
  return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
};
const fr = await runAgent("How does InvoiceChaser keep a human in the loop?", [], "test-key", forgot);
check(fr.sources.length > 0, `confident uncited answer still links its retrieved sources (${fr.sources.map((s) => s.title).join(", ")})`);

// The search cap holds even when the model asks for several searches in one round.
let capRound = 0;
const greedy: typeof fetch = async () => {
  capRound++;
  const call = (i: number) => ({ id: `c${i}`, type: "function", function: { name: "search_portfolio", arguments: JSON.stringify({ query: `query ${i}` }) } });
  const message = capRound === 1
    ? { role: "assistant", content: null, tool_calls: [1, 2, 3, 4, 5].map(call) }
    : { role: "assistant", content: "Done. [profile]" };
  return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
};
const capped = await runAgent("Tell me everything", [], "test-key", greedy);
const ran = capped.trace.filter((s) => s.kind === "tool").length;
check(ran === MAX_SEARCHES, `at most ${MAX_SEARCHES} searches per question, even with 5 requested at once (ran ${ran})`);

// Rate limit on the main model → same question succeeds on the fallback model.
const models: string[] = [];
const limited: typeof fetch = async (_url, init) => {
  const body = JSON.parse(String(init?.body));
  models.push(body.model);
  if (models.length === 1) return new Response(JSON.stringify({ error: { message: "Rate limit reached. Please try again in 9.5s." } }), { status: 429 });
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "He builds agents. [profile]" } }] }), { status: 200 });
};
const rl = await runAgent("What does he do?", [], "test-key", limited);
check(models[1] === FALLBACK_MODEL && rl.mode === "live" && rl.trace.some((s) => /Rate limit/.test(s.label)), `429 on ${models[0]} → retried on ${models[1]}`);

if (vectorSearchEnabled()) {
  console.log("\nLive semantic retrieval (Pinecone)");
  // The meaning ranking alone must find paraphrases that keyword search misses.
  // Top 6: for the vague "keep tabs" question the overview chunk (which summarises every project) ranks first.
  for (const [q, hrefs] of SEMANTIC_CASES) {
    const dense = await denseSearch(q, 6);
    check(dense.some((h) => hrefs.some((href) => h.href.startsWith(href))), `by meaning: ${q} → ${hrefs.join(" | ")}  [${dense.map((h) => `${h.id} ${h.score.toFixed(2)}`).join(", ")}]`);
  }
  // What the agent actually sends after rewriting a vague question into a search query.
  await hits4("monitoring and tracing AI agent runs", ["/projects/agent-observability"]);
  const scopedLive = await denseSearch("how are risky actions controlled", 4, "invoicechaser");
  check(scopedLive.length > 0 && scopedLive.every((h) => h.project === "invoicechaser"), `Pinecone project filter returns only that project [${scopedLive.map((h) => h.id).join(", ")}]`);
  const offTopic = await search("What's his favourite pizza?", 4);
  check(offTopic.length === 0, `off-topic question retrieves nothing [${offTopic.map((h) => h.id).join(", ")}]`);
}

if (process.env.GROQ_API_KEY) {
  console.log("\nLive model");
  // The last one is a general question: the model must be able to search without picking a project
  // (regression: gpt-oss sends project: null, which Groq rejected until the schema allowed it).
  for (const q of [...CASES.slice(0, 3).map(([q]) => q), "show any full stack apps he's made"]) {
    const live = await runAgent(q, [], process.env.GROQ_API_KEY);
    check(live.grounded && live.sources.length > 0, `${q} → grounded in ${live.sources.length} sources`);
  }

  console.log("\nLive conversation");
  const say = async (q: string, history: Array<{ role: "user" | "assistant"; content: string }>) => {
    await new Promise((res) => setTimeout(res, 8000)); // stay under the free tier's tokens-per-minute limit
    const r = await runAgent(q, history, process.env.GROQ_API_KEY!);
    history.push({ role: "user", content: q }, { role: "assistant", content: r.sources.length ? `${r.answer}\n(Sources: ${r.sources.map((s) => s.title).join(", ")})` : r.answer });
    return r;
  };
  const h1: Array<{ role: "user" | "assistant"; content: string }> = [];
  await say("Tell me about InvoiceChaser.", h1);
  const follow = await say("What stack did it use?", h1);
  check(follow.sources.some((s) => s.href.includes("invoicechaser")) && /langchain|langgraph|fastapi/i.test(follow.answer), `follow-up "it" resolves to InvoiceChaser [${follow.sources.map((s) => s.href).join(", ")}]`);
  const canned = /^\W*i[’']?m sorry,? but i can[’']?t help with that\W*$/i;
  const h2: Array<{ role: "user" | "assistant"; content: string }> = [];
  const math = await say("what is 2 + 2", h2);
  check(!canned.test(math.answer) && /chiranjeev|portfolio|work/i.test(math.answer), `off-topic gets an in-character redirect: "${math.answer.slice(0, 90)}"`);
  const why = await say("why can't you help?", h2);
  check(!canned.test(why.answer) && /portfolio|site|chiranjeev/i.test(why.answer), `"why?" is explained, not refused: "${why.answer.slice(0, 90)}"`);
  const cat = await say("does he have a cat?", []);
  check(/miso|ragdoll/i.test(cat.answer), `knows about Miso: "${cat.answer.slice(0, 90)}"`);
}

console.log(fail ? `\n${fail} failed` : "\nAll passed");
process.exit(fail ? 1 : 0);
}
main();
