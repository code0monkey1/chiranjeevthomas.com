# Proposal

## Why

The same first question to Miso keeps reporting "Cache miss". The cache key is fine: it is `sha256(normalizeQuestion(q))` in a deploy-scoped Netlify Blobs store, as `cache-miso-answers` planned. The problem is that answers are never written. The cacheability rule rejects every answer the fallback model wrote. On Groq's free tier (8K tokens/min on `openai/gpt-oss-120b`), one multi-round agent run often hits the limit and falls back to `openai/gpt-oss-20b`. The reported trace shows exactly that: "Rate limit on the main model, retrying with openai/gpt-oss-20b". So repeat questions miss for as long as the main model stays busy, which is exactly when a cache matters most.

## What Changes

- Grounded, cited answers from the fallback model become cacheable, at runtime and at build time. The other trust rules still apply: live mode, grounded, has sources, not "not covered", healthy meaning search, no raw citation markers.
- A cached fallback-model answer is served at once, then upgraded in the background. After a cooldown, one background run on the main model replaces it if that run produces a cacheable main-model answer. A main-model entry is never replaced by a fallback one.
- The build-time precompute still prefers the main model and retries once. It now keeps a fallback-model answer instead of dropping the bubble to live.
- Non-cacheable runs log one line saying why they were skipped, so a future "always misses" report can be diagnosed from the Netlify function logs.
- Operational: replace the rate-limited `GROQ_API_KEY` on Netlify (scopes: Builds and Functions) with the "latest" GroqCloud key (ending `…XDbo`; 999/1000 requests left at planning time), then redeploy. The key value goes only into Netlify's environment, never into the repo or these artifacts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chat-answer-cache`: "Only trustworthy answers are cached" changes so fallback-model answers can be cached. A new requirement says fallback-model entries get upgraded to main-model answers. This capability is defined by the in-flight `cache-miso-answers` change, which is not archived yet, so this change must be archived after it.

## Impact

- Code: `lib/answer-store.ts` (`isCacheable`, a guarded write that never downgrades), `app/api/chat/route.ts` (background upgrade on a fallback hit), `scripts/precompute-answers.ts` (keep fallback answers), `scripts/eval-chat.ts` (flip the fallback assertion, add upgrade and no-downgrade checks).
- Groq quota: each fallback entry costs at most one extra main-model run per cooldown window, and those runs count against the global daily limit.
- Config: Netlify `GROQ_API_KEY` value (no code change). The keys pasted into the planning conversation should be treated as exposed. Rotate the two that aren't used (`…fgbR`, `…MV3T`) when convenient.
- No dependency, API shape or client change. The cache-hit trace already names the model that answered.
