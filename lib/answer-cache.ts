/**
 * Answer-cache helpers shared by the chat UI and the server: how questions are matched, and how a
 * cached answer's trace is shown. Nothing here touches storage, so the browser can import it.
 */
import type { AgentResult, Step } from "./agent";

/**
 * What both caches store: the agent's result, which model wrote it, and when. `upgradeAfter` (ISO time) is
 * set on fallback-model entries: no background upgrade to the main model is attempted before it.
 */
export type CachedAnswer = { result: AgentResult; model: string; createdAt: string; upgradeAfter?: string };

/**
 * Two questions are "the same" when they differ only in letter case, spacing, curly vs straight
 * quotes or trailing punctuation. Nothing smarter: near-duplicates with different meaning must miss.
 */
export function normalizeQuestion(q: string): string {
  return q
    .normalize("NFKC")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?!.\s]+$/, "");
}

/**
 * The trace shown for a cached answer. It never passes the old run off as new work: a cache-hit step
 * comes first, then the original run's steps, demoted to indented sub-steps and labelled as that run.
 */
export function cachedTrace(cached: CachedAnswer, source: "build" | "runtime", lookupMs?: number): Step[] {
  const when = cached.createdAt.slice(0, 10);
  return [
    {
      kind: "done",
      label: source === "build" ? "Cache hit · build-time" : `Cache hit · runtime${lookupMs != null ? ` · ${lookupMs}ms` : ""}`,
      detail: `answered ${when} by ${cached.model}, no LLM or search calls now`,
    },
    { kind: "think", label: "Original run", detail: "the steps below are from that run" },
    ...cached.result.trace.map((s): Step => ({ ...s, kind: "step" })),
  ];
}
