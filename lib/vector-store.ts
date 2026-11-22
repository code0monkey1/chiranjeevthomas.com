import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import { resolveNamespace } from "./namespace";

/**
 * Semantic search over the chat chunks with Pinecone integrated inference: Pinecone embeds the text
 * itself (on upsert and on query) with a hosted model, so no embedding model runs in this app.
 */
export const INDEX_NAME = process.env.PINECONE_INDEX || "portfolio-chat";
export const EMBED_MODEL = "llama-text-embed-v2";

type Doc = { id: string; title: string; href: string; text: string; source: string; project?: string };
export type DenseHit = { id: string; score: number; title: string; href: string; text: string; source: string; project?: string };
type Fields = { content?: string; title?: string; href?: string; hash?: string; source?: string; project?: string; syncedAt?: string; publishedAt?: string };

/** The subset of Pinecone's namespace API used here (lets the evals pass in a fake). */
export interface VectorNamespace {
  listPaginated(o: { paginationToken?: string }): Promise<{ vectors?: Array<{ id?: string }>; pagination?: { next?: string } }>;
  fetch(o: { ids: string[] }): Promise<{ records: Record<string, { metadata?: Fields }> }>;
  upsertRecords(o: { records: Array<Record<string, string>> }): Promise<void>;
  deleteMany(o: { ids: string[] }): Promise<void>;
  searchRecords(o: { query: { topK: number; inputs: { text: string }; filter?: object }; fields: string[] }): Promise<{ result: { hits: Array<{ _id: string; _score: number; fields: object }> } }>;
  update(o: { id: string; metadata: Record<string, string> }): Promise<void>;
}

/** The record every namespace has; it carries the namespace's syncedAt / publishedAt stamps. */
export const STAMP_RECORD = "profile";

/**
 * Writes a timestamp into the namespace's profile record metadata. A metadata-only update: Pinecone keeps
 * the vector as it is (verified: the vector is bit-for-bit unchanged), so nothing is re-embedded.
 */
export async function stamp(ns: VectorNamespace, field: "syncedAt" | "publishedAt", at = new Date()) {
  await ns.update({ id: STAMP_RECORD, metadata: { [field]: at.toISOString() } });
}

export const vectorSearchEnabled = () => !!process.env.PINECONE_API_KEY;

let client: Pinecone | null = null;
const pinecone = () => (client ??= new Pinecone({ apiKey: process.env.PINECONE_API_KEY! }));

export function getNamespace(name = resolveNamespace()): VectorNamespace {
  return pinecone().index(INDEX_NAME).namespace(name) as unknown as VectorNamespace;
}

/** Creates the index (with its hosted embedding model) on first run. Free Starter indexes live in AWS us-east-1. */
export async function ensureIndex() {
  const { indexes = [] } = await pinecone().listIndexes();
  if (indexes.some((i) => i.name === INDEX_NAME)) return false;
  await pinecone().createIndexForModel({
    name: INDEX_NAME,
    cloud: "aws",
    region: "us-east-1",
    embed: { model: EMBED_MODEL, fieldMap: { text: "content" } },
    waitUntilReady: true,
  });
  return true;
}

const docText = (d: Doc) => `${d.title}. ${d.text}`;
const hashOf = (d: Doc) => createHash("sha1").update(`${EMBED_MODEL}\n${d.href}\n${d.source}\n${d.project ?? ""}\n${docText(d)}`).digest("hex");

/**
 * One short hash of everything that gets embedded (each chunk's hashOf, which includes EMBED_MODEL).
 * Sorted first, so file read order can't change it. Names the build's Pinecone namespace.
 */
export const corpusHash = (docs: Doc[]) => createHash("sha256").update(docs.map(hashOf).sort().join("\n")).digest("hex").slice(0, 8);
const batches = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * Makes the namespace match the chunks: upserts new or changed chunks (Pinecone re-embeds them),
 * deletes chunks that no longer exist, and leaves unchanged ones alone (no embedding tokens spent).
 */
export async function syncRecords(docs: Doc[], ns: VectorNamespace = getNamespace()) {
  const existing: string[] = [];
  let token: string | undefined;
  do {
    const page = await ns.listPaginated({ paginationToken: token });
    page.vectors?.forEach((v) => v.id && existing.push(v.id));
    token = page.pagination?.next;
  } while (token);

  const storedHash = new Map<string, string | undefined>();
  for (const ids of batches(existing, 100)) {
    const { records } = await ns.fetch({ ids });
    for (const [id, r] of Object.entries(records)) storedHash.set(id, r.metadata?.hash);
  }

  const changed = docs.filter((d) => storedHash.get(d.id) !== hashOf(d));
  for (const group of batches(changed, 90)) {
    await ns.upsertRecords({
      records: group.map((d) => ({ id: d.id, content: docText(d), title: d.title, href: d.href, source: d.source, ...(d.project ? { project: d.project } : {}), hash: hashOf(d) })),
    });
  }
  const keep = new Set(docs.map((d) => d.id));
  const removed = existing.filter((id) => !keep.has(id));
  for (const ids of batches(removed, 1000)) await ns.deleteMany({ ids });

  return { upserted: changed.length, deleted: removed.length, unchanged: docs.length - changed.length, changedIds: changed.map((d) => d.id) };
}

let warmedAt = 0;
/**
 * Opens the connection to the index (host lookup + TLS) ahead of the first search. Called when a
 * question arrives, so it overlaps the LLM's first round instead of adding a cold start to the search.
 */
export function warmUp() {
  if (!vectorSearchEnabled() || Date.now() - warmedAt < 30_000) return;
  warmedAt = Date.now();
  pinecone().index(INDEX_NAME).describeIndexStats().catch(() => { warmedAt = 0; });
}

/** Dev only: remember the last synced content across restarts, so the first question doesn't re-check every chunk. */
const memoFile = (ns: string) => path.join(process.cwd(), ".next", "cache", `pinecone-synced-${ns}.txt`);
let lastSynced = "";
/** Dev only: push content edits to Pinecone on the next question, so the chat sees them without a rebuild. */
export async function syncIfChanged(docs: Doc[], ns: VectorNamespace = getNamespace()) {
  const key = createHash("sha1").update(docs.map(hashOf).join()).digest("hex");
  const ns_ = resolveNamespace();
  if (!lastSynced) try { lastSynced = fs.readFileSync(memoFile(ns_), "utf8"); } catch { /* first run */ }
  if (key === lastSynced) return;
  const r = await syncRecords(docs, ns);
  lastSynced = key;
  try { fs.mkdirSync(path.dirname(memoFile(ns_)), { recursive: true }); fs.writeFileSync(memoFile(ns_), key); } catch { /* best effort */ }
  if (r.upserted || r.deleted) {
    console.log(`[search] synced content to Pinecone: ${r.upserted} upserted, ${r.deleted} deleted`);
    // Pinecone indexes upserts within a few seconds; wait briefly so this question already sees them.
    await new Promise((res) => setTimeout(res, 3000));
  }
}

/** llama-text-embed-v2 scores off-topic questions ("favourite pizza?") around 0.1; real matches start near 0.2. */
export const MIN_SCORE = 0.15;

/** Meaning-based search. With `project`, Pinecone only considers that project's chunks (metadata filter). */
export async function denseSearch(query: string, k: number, project?: string, ns: VectorNamespace = getNamespace()): Promise<DenseHit[]> {
  const res = await ns.searchRecords({
    query: { topK: k, inputs: { text: query }, ...(project ? { filter: { project: { $eq: project } } } : {}) },
    fields: ["title", "href", "content", "source", "project"],
  });
  // The floor screens out off-topic questions; once scoped to a project, its best chunks are wanted anyway.
  return res.result.hits.filter((h) => project || h._score >= MIN_SCORE).map((h) => {
    const f = h.fields as Fields;
    const title = f.title ?? "";
    const content = f.content ?? "";
    const text = content.startsWith(`${title}. `) ? content.slice(title.length + 2) : content;
    return { id: h._id, score: h._score, title, href: f.href ?? "/", text, source: f.source ?? "", project: f.project };
  });
}

/** The subset of Pinecone's index API that pruning needs (lets the evals pass in a fake). */
export interface PrunableIndex {
  listNamespaces(o?: { prefix?: string; paginationToken?: string }): Promise<{ namespaces?: Array<{ name?: string }>; pagination?: { next?: string } }>;
  deleteNamespace(name: string): Promise<void>;
  namespace(name: string): VectorNamespace;
}

/** Published namespaces kept besides the live one: enough to roll back four content versions with full search. */
export const KEEP_PUBLISHED = 4;
/** An unpublished namespace synced this recently may belong to a build still in progress, so it is kept. */
export const IN_BUILD_MS = 60 * 60 * 1000;

/**
 * Runs after a deploy is live (the prune-vectors build plugin, onSuccess). Stamps the live namespace as
 * published, then deletes namespaces in the same environment except: the live one, any unpublished one
 * synced within the last hour (a build may be using it), and the KEEP_PUBLISHED most recently published.
 * Retention ranks by publishedAt, not syncedAt, so a failed build's leftover never outlives a namespace
 * that real visitors were served. Errors are logged, never thrown: pruning must not affect a deploy.
 */
export async function pruneNamespaces(index: PrunableIndex, live: string, prefix: string, now = new Date(), log: (msg: string) => void = console.log) {
  const kept: string[] = [], deleted: string[] = [];
  try {
    await stamp(index.namespace(live), "publishedAt", now);
  } catch (err) {
    log(`prune: could not stamp ${live} as published (${(err as Error).message}); not pruning this time`);
    return { kept, deleted };
  }
  const names: string[] = [];
  let token: string | undefined;
  do {
    const page = await index.listNamespaces({ prefix, paginationToken: token });
    page.namespaces?.forEach((n) => n.name?.startsWith(prefix) && names.push(n.name));
    token = page.pagination?.next;
  } while (token);

  const others = await Promise.all(names.filter((n) => n !== live).map(async (name) => {
    let meta: Fields | undefined;
    try { meta = (await index.namespace(name).fetch({ ids: [STAMP_RECORD] })).records[STAMP_RECORD]?.metadata; } catch { /* unreadable: treat as unstamped */ }
    const published = meta?.publishedAt ? Date.parse(meta.publishedAt) : 0;
    const synced = meta?.syncedAt ? Date.parse(meta.syncedAt) : 0;
    return { name, published, inBuild: !published && synced > 0 && now.getTime() - synced < IN_BUILD_MS };
  }));
  const recent = new Set(others.filter((o) => o.published).sort((a, b) => b.published - a.published).slice(0, KEEP_PUBLISHED).map((o) => o.name));
  kept.push(live);
  for (const o of others) {
    if (o.inBuild || recent.has(o.name)) { kept.push(o.name); continue; }
    try { await index.deleteNamespace(o.name); deleted.push(o.name); } catch (err) { log(`prune: could not delete ${o.name} (${(err as Error).message})`); }
  }
  log(`prune: kept ${kept.join(", ")}${deleted.length ? `; deleted ${deleted.join(", ")}` : "; nothing to delete"}`);
  return { kept, deleted };
}

/** The real index, for pruneNamespaces. */
export const prunableIndex = (): PrunableIndex => {
  const idx = pinecone().index(INDEX_NAME);
  return {
    listNamespaces: (o) => idx.listNamespaces(o) as never,
    deleteNamespace: (name) => idx.deleteNamespace(name),
    namespace: (name) => getNamespace(name),
  };
};
