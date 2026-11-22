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

/** Next patches global fetch with its data cache; Blobs traffic must never be cached by it. */
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

let injected: AnswerStore | null | undefined;
/** Tests pass an in-memory store; `null` turns the cache off. */
export function setAnswerStore(s: AnswerStore | null | undefined) { injected = s; warned = false; }

let warned = false;
const warnOnce = (what: string, err: unknown) => {
  if (warned) return;
  warned = true;
  console.warn(`[answer-cache] ${what} failed, answering live:`, (err as Error).message);
};

/** The deploy's store, or null where Netlify Blobs isn't available (next dev, evals). */
export function answerStore(): AnswerStore | null {
  if (injected !== undefined) return safeStore(injected);
  let blobs: ReturnType<typeof getDeployStore>;
  try {
    blobs = getDeployStore({ name: "miso-answers", fetch: noStoreFetch });
  } catch (err) {
    if ((err as Error).name !== "MissingBlobsEnvironmentError") warnOnce("opening the store", err);
    return null;
  }
  return {
    async get(key) {
      try { return (await blobs.get(key, { type: "json" })) as CachedAnswer | null; } catch (err) { warnOnce("read", err); return null; }
    },
    async set(key, value) {
      try { await blobs.setJSON(key, value); } catch (err) { warnOnce("write", err); }
    },
  };
}

/** Wraps a store so a throwing get/set (e.g. a broken test double) still degrades to a miss / no-op. */
export function safeStore(s: AnswerStore | null): AnswerStore | null {
  if (!s) return null;
  return {
    async get(key) { try { return await s.get(key); } catch (err) { warnOnce("read", err); return null; } },
    async set(key, value) { try { await s.set(key, value); } catch (err) { warnOnce("write", err); } },
  };
}
