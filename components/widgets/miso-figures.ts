/**
 * Every number the Miso write-up's widgets show, in one place, copied from the change's measurement log
 * (openspec/changes/miso-chat-blog-post/measurements.md). The post quotes the same values, so the
 * prose and the diagrams can't disagree. Update both together and bump `asOf`.
 */
export const FIGURES = {
  asOf: "November 2026",
  /** Before caching: production, 20 runs (4 suggestions × 5), medians. */
  before: { firstWords: "1.6–1.8 s", total: "about 2.0 s", groqCalls: 2, searches: 1 },
  /** Groq's published limits for gpt-oss-120b on this plan. */
  groq: { requestsPerDay: "1,000", tokensPerMinute: "8K", answersPerDay: "about 500" },
  /** After caching (filled from production measurements). */
  after: {
    bubble: "under 0.1 s",
    cacheHitLookup: "about 50 ms",
    cacheMissLookup: "about 15–45 ms",
    liveAnswer: "about 2 s",
  },
  vectors: { chunks: 43, fullEmbedTokens: "about 6K", namespacesKept: 5, starterNamespaceCap: 100 },
} as const;
