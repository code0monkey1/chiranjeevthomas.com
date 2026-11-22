# Tasks

## 1. Cache rules accept fallback answers

- [x] 1.1 In `lib/answer-store.ts`, add `cacheSkipReason(r)` (reasons from design Decision 1), make `isCacheable` delegate to it, and drop the `r.model === MODEL` clause. Add optional `upgradeAfter` to `CachedAnswer` in `lib/answer-cache.ts`. Verify: `npm run eval:chat` passes after 1.2.
- [x] 1.2 In `scripts/eval-chat.ts`, flip "fallback-model answers are not cached" to assert that they are cacheable, and assert that `cacheSkipReason` returns the expected reason for each existing negative case. Verify: `npm run eval:chat` is green.

## 2. Runtime write: no downgrade, skip log

- [x] 2.1 In `app/api/chat/route.ts`, change the `after()` write: log `[answer-cache] skip <reason> key=<12 hex>` when `cacheSkipReason` is non-null. For a non-`MODEL` result, re-read the key and skip with `primary-exists` if a `MODEL` entry exists. Verify with an eval that drives the route's write path against an injected in-memory store (`setAnswerStore`): a fallback result writes into an empty store, a fallback result doesn't overwrite a `MODEL` entry, a `MODEL` result overwrites a fallback entry, and the log line has no question text.

## 3. Background upgrade on a fallback hit

- [x] 3.1 Add `takeUpgrade()` to the limiter: a separate small daily budget (`CHAT_UPGRADE_DAILY_LIMIT`, default 50) that never touches visitor counters. Verify: an eval with the limit set to 1 sees the second `takeUpgrade()` refused.
- [x] 3.2 On a hit whose `model !== MODEL`: return the cached answer as today, and if the entry is due (`upgradeAfter`, or `createdAt` + 60 s), not in flight on this instance, and `takeUpgrade()` allows it, schedule the upgrade in `after()` (write the claim with `upgradeAfter` = now + 10 min, run the agent silently, overwrite only on a cacheable `MODEL` result). Verify with evals using the mocked Groq fetch and the in-memory store: (a) the hit response comes back unchanged, (b) when due, a `MODEL` mock run replaces the entry, (c) a still-429 mock run leaves the entry and sets `upgradeAfter`, (d) an entry inside its cooldown triggers no agent call.
- [x] 3.3 Update the README chat or cache section so it says fallback answers are cached and upgraded in the background. Verify: the README describes the cooldown and the no-downgrade rule.

## 4. Build-time precompute

- [x] 4.1 In `scripts/precompute-answers.ts`, keep the 20 s retry when `r.model !== MODEL`, then keep the retry if it's cacheable on `MODEL`, else whichever run is cacheable (the retry wins ties). Log the model per bubble. Verify: `npm run precompute:answers -- --skip-llm` still writes empty suggestions, and a local run with a valid key logs `✓` lines that name the model.

## 5. Groq key swap and deploy check

- [ ] 5.1 After confirming with the user, set Netlify `GROQ_API_KEY` to the "latest" GroqCloud key (…XDbo) for the Builds and Functions scopes in every deploy context, using the Netlify MCP or CLI without echoing the value. Update `.env.local` if present. Verify: `GET /api/chat` on the new deploy returns `live: true`, and the build log shows `N/4 suggestions precomputed`.
- [ ] 5.2 Integration check on the production deploy: ask one typed first question in two private windows at least 60 s apart. Expect the second trace to start with "Cache hit · runtime". In the Netlify function logs, expect either no `[answer-cache] skip` line for that key, or an upgrade line if the first run fell back.

## Workflow follow-up

- Archive `cache-miso-answers` before this change, so the MODIFIED requirement applies on top of the `chat-answer-cache` main spec.
- Rotate the two unused Groq keys (…fgbR, …MV3T) pasted into the planning conversation.
