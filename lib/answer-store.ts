/**
 * Server-side answer cache: what may be cached, the cache key, and the deploy-scoped Netlify Blobs store.
 *
 * The store is scoped to the deploy (getDeployStore), so every deploy starts empty and a rollback brings
 * back that deploy's own answers. Every read or write failure degrades to "no cache": a cache problem
 * must never fail a chat request.
 */
import { createHash } from "node:crypto";
import { getDeployStore } from "@netlify/blobs";
import { MODEL, notCovered, type AgentResult } from "./agent";
import { normalizeQuestion, type CachedAnswer } from "./answer-cache";

/**
 * Only trustworthy answers are cached: written by the live agent on the main model, grounded, with at
 * least one source, not a "the portfolio doesn't cover that" reply, and found with a working meaning
 * search. That last rule keeps keyword-only answers (Pinecone down, or a rolled-back deploy whose
 * namespace was pruned) from being frozen in a cache for the deploy's lifetime.
 */
export function isCacheable(r: AgentResult): boolean {
  return r.mode === "live" && r.grounded && r.sources.length > 0 && r.model === MODEL && !notCovered(r.answer)
    && r.search.meaningOk && r.search.meaningHits > 0;
}

/** A hash of the normalised question. The visitor's text itself is never stored. */
export const questionKey = (question: string) => `q/${createHash("sha256").update(normalizeQuestion(question)).digest("hex")}`;

export interface AnswerStore {
  get(key: string): Promise<CachedAnswer | null>;
  set(key: string, value: CachedAnswer): Promise<void>;
}

/**
 * Next patches global fetch with its data cache, and Blobs traffic must never go through it. Same approach
 * as Netlify's own Next.js adapter (regional-blob-store): the fetch saved before Next patched it, marked
 * internal so even a patched fetch skips the data cache.
 */
const blobsFetch: typeof fetch = (input, init) => {
  const g = globalThis as Record<symbol, unknown>;
  const base = (g[Symbol.for("nf-not-patched-fetch")] as typeof fetch | undefined) ?? ((fetch as unknown as { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ?? fetch);
  return base(input, { ...init, next: { ...(init as { next?: object })?.next, internal: true } } as RequestInit);
};
/** Like the adapter: an explicit region, so the client never has to resolve one at request time. */
const BLOBS_REGION = process.env.USE_REGIONAL_BLOBS?.toUpperCase() === "TRUE" ? undefined : "us-east-2";

/** A cache that hangs must not hang the chat: give up and answer live. */
const GET_TIMEOUT_MS = 1500;
const SET_TIMEOUT_MS = 4000;
function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p, new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(`${what} timed out after ${ms}ms`)), ms); })]).finally(() => clearTimeout(t));
}

let injected: AnswerStore | null | undefined;
/** Tests pass an in-memory store; `null` turns the cache off. */
export function setAnswerStore(s: AnswerStore | null | undefined) { injected = s; warned = false; }

let warned = false;
const warnOnce = (what: string, err: unknown) => {
  if (warned) return;
  warned = true;
  console.warn(`[answer-cache] ${what} failed, answering live: ${(err as Error).name}: ${(err as Error).message}`);
};

/** The deploy's store, or null where Netlify Blobs isn't available (next dev, evals). */
export function answerStore(): AnswerStore | null {
  if (injected !== undefined) return safeStore(injected);
  let blobs: ReturnType<typeof getDeployStore>;
  try {
    blobs = getDeployStore({ name: "miso-answers", fetch: blobsFetch, ...(BLOBS_REGION ? { region: BLOBS_REGION } : {}) } as unknown as { name: string });
  } catch (err) {
    if ((err as Error).name !== "MissingBlobsEnvironmentError") warnOnce("opening the store", err);
    return null;
  }
  return {
    async get(key) {
      try { return (await withTimeout(blobs.get(key, { type: "json" }), GET_TIMEOUT_MS, "read")) as CachedAnswer | null; } catch (err) { warnOnce("read", err); return null; }
    },
    async set(key, value) {
      try { await withTimeout(blobs.setJSON(key, value), SET_TIMEOUT_MS, "write"); } catch (err) { warnOnce("write", err); }
    },
  };
}

/** Wraps a store so a throwing get/set (e.g. a broken test double) still degrades to a miss / no-op. */
export function safeStore(s: AnswerStore | null): AnswerStore | null {
  if (!s) return null;
  return {
    async get(key) { try { return await withTimeout(s.get(key), GET_TIMEOUT_MS, "read"); } catch (err) { warnOnce("read", err); return null; } },
    async set(key, value) { try { await withTimeout(s.set(key, value), SET_TIMEOUT_MS, "write"); } catch (err) { warnOnce("write", err); } },
  };
}
