# Design

## Context

See proposal.md for why. What the code does today:

- `app/api/chat/route.ts` looks up `questionKey(question)` (`q/` + sha256 of `normalizeQuestion`) in the deploy store `miso-answers` before anything else on a first turn. On a miss it runs the agent and writes in `after()`, but only if `isCacheable(result)`.
- `isCacheable` (`lib/answer-store.ts:19`) requires `r.model === MODEL`. `complete()` (`lib/agent.ts:44`) switches to `FALLBACK_MODEL` on any 429, and the run then records `model = FALLBACK_MODEL`. A rate-limited run is therefore never written, and every repeat misses again. That matches the reported trace: "Cache miss · 21ms", then "Rate limit on the main model, retrying with openai/gpt-oss-20b".
- Both store failures and skipped writes are silent. `warnOnce` logs only the first store error per instance, and a skipped write isn't logged at all. So the failure looked like a broken key.
- All three Groq keys the user has are free tier: 8,000 tokens/min and 1,000 requests/day on `gpt-oss-120b`, read from the `x-ratelimit-*` headers on 2026-11-22. A different key adds daily headroom but doesn't raise the per-minute cap. Fallbacks will keep happening, so the cache has to cope with them.
- Build-time answers (`scripts/precompute-answers.ts`) use the same `isCacheable`, so rate-limited bubbles also drop to live.

## Goals / Non-Goals

**Goals:**
- A repeat first question is a cache hit even when its first answer came from the fallback model.
- Cached quality moves toward the main model over time without the visitor waiting.
- The next "always misses" report can be diagnosed from the function logs.

**Non-Goals:**
- Raising Groq throughput: no key pool and no paid tier (the user chose a single key swap).
- Upgrading build-time (bundled) fallback answers between deploys. A redeploy recomputes them.
- Changing normalisation, key format, store scope or the trace layout.

## Decisions

### 1. One rule function that returns a reason

Replace the boolean body with `cacheSkipReason(r): string | null`. It returns `"demo"`, `"ungrounded"`, `"no-sources"`, `"not-covered"`, `"meaning-search-degraded"`, `"raw-citations"`, or `null` when cacheable. `isCacheable(r)` becomes `cacheSkipReason(r) === null`. The `r.model === MODEL` clause is dropped.
- **Why:** the runtime, the precompute and the evals already share one predicate. Returning the reason gives the skip log for free, with no second copy of the rules that could drift.
- **Alternative:** keep the boolean and log the full result. Rejected: noisy, and it would risk logging question-derived text.

### 2. Never downgrade on write

Before writing an answer whose `model !== MODEL`, the route re-reads the key. If an entry from `MODEL` exists, it skips the write and logs `skip primary-exists`.
- **Why:** two instances can miss the same question at once. Reads are eventually consistent (up to about 60 s), so the check is best-effort, not a lock. That's enough: the worst case is a fallback answer that a later upgrade replaces.
- Main-model writes never check first. Overwriting with a main-model answer is always allowed.

### 3. Stale-while-upgrade on a fallback hit

`CachedAnswer` gains an optional `upgradeAfter?: string` (ISO time).

```
hit and hit.model !== MODEL:
  respond with the cached answer now (normal cache-hit trace)
  due = now >= (hit.upgradeAfter ?? hit.createdAt + 60s)  // the next TPM window
  if due and key not in this instance's inFlight set and the global budget allows:
     after(async () => {
       inFlight.add(key)
       store.set(key, { ...hit, upgradeAfter: now + 10 min })   // claim: other instances back off
       r = runAgent(question, [], apiKey)                         // no streaming events
       if isCacheable(r) and r.model === MODEL: store.set(key, { result: r, model: MODEL, createdAt: now })
       else log "upgrade skipped: <reason or 'still fallback'>"
       inFlight.delete(key)
     })
```

- **Budget:** the run counts one against the instance's global daily total (`GLOBAL_DAILY_LIMIT`), through a new `takeGlobal()` that doesn't touch per-IP counters. The visitor who triggered it isn't charged, which matches "hits don't count against limits". The cooldown claim caps each question at one upgrade run per 10 minutes.
- **Why `after()`:** it is already used for writes, and the installed adapter (5.16.4) maps it to Netlify `context.waitUntil`. The hit response streams and closes before the upgrade starts.
- **Alternative: serve a fallback hit as a miss and run live.** Rejected: that's today's bug with extra steps. Every repeat waits on the model and spends quota.
- **Alternative: never upgrade.** Rejected by the user: they chose "cache, upgrade later".

### 4. Build-time: prefer main, keep fallback

The precompute keeps its one 20 s retry when `r.model !== MODEL`. It keeps the retry if that is cacheable on `MODEL`, else whichever of the two runs is cacheable (the retry wins ties), else nothing. The log line notes which model wrote each bubble.

### 5. Skip log

On every first-turn live run that isn't written, there's one `console.info` line: `[answer-cache] skip <reason> key=<first 12 hex chars>`. It holds no question text, as the spec requires. It also replaces the guesswork about whether the store or the rules were to blame.

### 6. Key swap is configuration only

Set `GROQ_API_KEY` on the Netlify site to the "latest" key (…XDbo) for the Builds and Functions scopes, all deploy contexts, then trigger a production deploy. Functions read env only on deploy, and the new deploy also starts a fresh store. The key never enters the repo, `.env.example` or these artifacts. Update the local `.env.local` the same way if it's used for evals.

## Risks / Trade-offs

- [The 20B answer is weaker and now gets served from cache.] → It must still be grounded and cited, the trace says which model wrote it, and an upgrade replaces it within minutes once quota frees up.
- [Upgrade runs spend quota in a busy minute and fall back again.] → The 60 s first-upgrade delay plus the 10 min cooldown per question. Runs count against the global daily cap. A failed upgrade leaves the entry as it is.
- [Eventually consistent reads let two instances both upgrade, or a fallback write slip past the no-downgrade check.] → Wasted quota at worst, never a wrong answer. Bounded by the cooldown claim.
- [An upgrade run fails mid-way, for example the function is killed.] → The claim stays, the old entry keeps being served, and the next attempt comes after the cooldown.
- [The new key is also exhausted later.] → Same behaviour as now (fallback, then retrieval-only on a hard failure), but repeats are now served from the cache.
- [The keys pasted in chat are exposed.] → Recommend rotating the two unused keys. The key now in use stays only in Netlify env.

## Migration Plan

1. Merge the code change, then swap the Netlify key and deploy (in that order or together, since one deploy picks up both).
2. On the deploy, ask a typed first question twice, at least 60 s apart, in two private windows. Expect the second to show "Cache hit · runtime". If the first run fell back, filter the function logs for `[answer-cache]` and expect an upgrade line after the second request.
3. Rollback: publish the previous deploy. Its own store and rules come back with it, and nothing needs cleaning up.
