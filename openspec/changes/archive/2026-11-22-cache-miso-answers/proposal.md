# Proposal

## Why

Every Miso answer, including the four fixed suggestion bubbles that most visitors click, re-runs the full agent: two or more Groq calls plus one or more Pinecone searches. That costs seconds of latency, uses up the visitor's daily quota, and burns the free-tier 8K tokens a minute shared by everyone. Answers can only change when a new version of the site is deployed, so recomputing them on every click is waste.

## What Changes

- **Suggested answers precomputed at build time.** A new prebuild step runs the agent once for each suggestion bubble, after `sync:vectors`. It keeps only grounded live answers and writes them, with their original trace, into a generated JSON module that ships with the client bundle. Clicking a bubble shows the answer instantly, with no network call. Each build regenerates the file, so these answers are replaced on every deploy.
- **Runtime answer cache for typed questions, scoped to the deploy.** First-turn questions (empty history) are looked up in a deploy-scoped Netlify Blobs store before the agent runs, keyed by a hash of the normalised question. On a miss, a grounded live answer from the primary model is written back. Every deploy gets its own empty store, and Netlify deletes the store along with the deploy. So every deploy evicts the cache, by construction.
- **Honest trace for cached answers.** The trace panel shows a `Cache hit` step (build-time or runtime, with lookup time). The original run's steps follow, labelled as that run. A cached answer never appears to be fresh work.
- **Cache hits skip the rate limit**, because they cost no Groq or Pinecone quota.
- Retrieval-only answers, error fallbacks, "not covered" answers and fallback-model answers are never cached.
- If the build cannot precompute (Groq down, no key) or Blobs is unavailable (local `next dev`), the chat falls back to the current behaviour. Neither case fails the build or the request.

## Capabilities

### New Capabilities
- `chat-answer-cache`: When Miso answers come from a cache instead of a live agent run, how cached answers are keyed and scoped to a deploy, and how a cache hit is shown to the visitor.

### Modified Capabilities
<!-- None: there are no existing specs in openspec/specs/. -->

## Impact

- **Code:** `app/api/chat/route.ts` (lookup before the rate limit and agent, background write-back after), `lib/agent.ts` (reports which model answered, exports `notCovered`), new `lib/answer-cache.ts`, new `lib/suggestions.ts`, new `scripts/precompute-answers.ts`, `scripts/sync-vectors.ts` (waits for indexing after upserts), `components/chat/ChatMiso.tsx` (serves bubbles from the generated module, shows cache trace steps), `package.json` (prebuild/predev chain).
- **Dependencies:** adds `@netlify/blobs`. The Netlify adapter already bundles a copy internally, but the app can't import that copy.
- **Build:** about 4 extra agent runs per build, which needs `GROQ_API_KEY` in the Netlify build environment. These runs never fail the build.
- **Data:** answers are stored per deploy, keyed by a hash. Visitors' raw questions are not stored.
- **Tests:** `scripts/eval-chat.ts` gains cases for key normalisation, cacheability rules, the cache-hit trace shape, and the route's hit/miss/follow-up paths against a fake store.
