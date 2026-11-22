# Design

## Context

- `/api/chat` (`app/api/chat/route.ts`) is a stateless Next.js route on Netlify (`@netlify/plugin-nextjs` 5.16.4). Every POST runs `runAgent(question, history)`, which makes Groq calls (streamed as NDJSON) and searches Pinecone. Rate limits are per-instance, in-memory counters.
- **Every input to an answer changes only on a deploy:**
  - Content is synced to Pinecone in `prebuild`.
  - `SYSTEM`, the tool schema and `finalize()` ship in the bundle.
  - Functions pick up env changes (such as `GROQ_MODEL`) only on a new deploy.
- `runAgent` can silently switch to `FALLBACK_MODEL` on a 429. Its result does not currently say which model answered.
- `prebuild` already runs `sync:vectors`. Pinecone takes a few seconds to make upserts searchable (see `syncIfChanged`).
- The four `SUGGESTIONS` live in `components/chat/ChatMiso.tsx`. The client already handles a JSON response and an NDJSON stream. `readEvents` resolves only when the stream closes, not on the `done` event.

### Verified in the installed adapter (5.16.4)

- **Runtime writes to a deploy store work.** The adapter's own Next cache handler (`dist/run/handlers/cache.cjs`, `NetlifyCacheHandler.set`) writes during requests through `getRegionalBlobStore()`, which wraps `getDeployStore` (`dist/run/storage/regional-blob-store.cjs`).
- **Background work after the response works.** The adapter connects Next's `waitUntil` (used by `after()` from `next/server`) to Netlify's `context.waitUntil` (`dist/run/handlers/wait-until.cjs`, `request-context.cjs`).

## Goals / Non-Goals

**Goals:**
- Suggestion bubbles answer in about 0 ms with no server round trip.
- A typed first question repeated by any visitor on any instance of the same deploy is answered from the cache.
- Every deploy evicts the cache by construction: there's no invalidation logic that could be wrong.
- Every failure path falls back to today's behaviour.

**Non-Goals:**
- Keeping the cache warm across deploys that don't change answers (see Decision 1, alternative).
- Semantic or near-duplicate matching (only exact matches after normalisation).
- Caching follow-up turns. Answers there depend on history.
- Caching the retrieval-only demo mode.
- Changing rate-limit storage. It stays in-memory and best-effort.
- Changing how vectors are synced or namespaced (a possible follow-up change, outside this one).

## Decisions

### 1. Deploy-scoped Netlify Blobs store

`getDeployStore("miso-answers")` from a direct `@netlify/blobs` dependency. The adapter's copy is bundled and can't be imported.

- **Why:** since answer inputs change only on deploys, scoping to the deploy is always correct.
  - Preview and production isolation come for free.
  - A rollback brings back that deploy's own answers, which match that deploy's prompt and code.
  - Netlify deletes the store with the deploy, so no pruning is needed.
- **Alternative considered:** a site-wide store keyed by a content-and-code fingerprint. It would keep the cache warm across deploys that don't change answers (5 of the 12 non-merge commits from 21 Oct to 21 Nov 2026 touched neither `content/` nor the agent and search code). But it's only correct if every input is in the hash, and it needs fingerprint code, source hashing and pruning. Rejected: the runtime cache fills again after a few questions, and the bubbles, which get most of the repeat traffic, are precomputed on every build anyway.
- **Region:** rely on the environment context. If the deploy store throws its "needs to be configured with a region" error, pass `region` explicitly, as the adapter does (`us-east-2` unless `USE_REGIONAL_BLOBS`). Task 4.1 verifies this on a deploy preview.
- **Missing Blobs context** (local `next dev`, the evals): `getDeployStore` throws `MissingBlobsEnvironmentError`. The cache detects this once and becomes a no-op for that instance.

### 2. Key, value, consistency, write timing

- Key: `q/${sha256(normalize(question))}`. Value: `{ result: AgentResult, model, createdAt }`.
  - No key or field holds the visitor's question.
  - The stored trace keeps the model's own `search_portfolio(...)` query labels, which often paraphrase the question. Keeping them is deliberate, so the replayed trace stays honest (see spec).
- `normalize`: Unicode NFKC, curly quotes to straight, lowercase, trim, collapse whitespace, strip trailing `?!.` characters.
- Reads use eventual consistency (the default). A new entry may take up to about 60 s to become visible everywhere. That is acceptable for a cache.
- Next patches `globalThis.fetch`. The store is created with `fetch: (u, i) => fetch(u, { ...i, cache: "no-store" })`, so Next's data cache never intercepts Blobs traffic. The adapter does the same for its own store.
- Writes are scheduled with `after()`, so the stream closes as soon as `done` is sent. An inline write would hold back the client's sources, trace and `busy=false`, because `readEvents` only resolves when the stream closes.

### 3. Build-time answers: one prebuild script, one generated module

```
prebuild:  sync:vectors  -->  precompute:answers
             (waits ~5s if anything was upserted, so the index is searchable)

precompute:answers
  for q in SUGGESTIONS (sequentially, ~2s apart, to stay under Groq's 8K tokens/min):
     r = runAgent(q, [], GROQ_API_KEY)
     keep if isCacheable(r)            // same predicate as runtime
  write lib/generated/answers.json  { builtAt, suggestions: { [q]: result } }
  any failure  -> warn, write the file with whatever succeeded (possibly {}), exit 0
```

- `SUGGESTIONS` moves from `ChatMiso.tsx` to `lib/suggestions.ts`, so the script and the UI can't drift apart.
- `lib/generated/answers.json` is gitignored. `predev` and `preeval:chat` run the script with `--skip-llm`, which makes no Groq calls and writes empty suggestions.
  - The module therefore always exists for dev, evals and type-checking.
  - Dev never shows answers that are stale relative to content edited during dev (`syncIfChanged`).
- **Client-side match:** `ChatMiso` imports the module. Before posting, it normalises the question (same `normalize`) and checks it against the precomputed keys. This covers bubble clicks and a visitor typing a suggestion verbatim, with or without history (spec: bubbles are standalone).
- **Alternative considered:** serving precomputed answers from the route. That still costs a round trip and a function invocation. Putting them in the bundle is cheaper and works even when the function is cold.

### 4. Cacheability predicate shared by both caches

`AgentResult` gains `model: string`: whichever model produced the final message. Then:

```
isCacheable(r) = r.mode === "live" && r.grounded && r.sources.length > 0
                 && r.model === MODEL && !notCovered(r.answer)
```

`notCovered` is pulled out of `runAgent` into an exported helper, so the predicate and the agent agree on what "not covered" means.

### 5. Route order

```
POST /api/chat
  parse + validate
  if history is empty and the cache is enabled:
     t0; hit = store.get(key)             // a failure counts as a miss
     if hit: NDJSON { step: Cache hit (runtime) · Nms } + { done: hit.result with trace re-labelled } ; return
     (on a miss, note a "Cache miss · Nms" step, shown once the agent starts)
  limited(ip) ?                            // after the lookup: hits skip the quota
  runAgent(...) streams as today
  send done ; close
  if history is empty and isCacheable(result): after(() => store.setJSON(key, ...))   // try/catch, best effort
```

### 6. Honest trace

- The trace from a cache hit is `[{kind:"done", label:"Cache hit · build-time" | "Cache hit · runtime · 12ms", detail:"answered <date> by <model>, no LLM or search calls"}, {kind:"think", label:"Original run", detail:"steps below are from that run"}, ...originalSteps as kind "step"]`.
  - Demoting the original steps to `step` indents them, which reads as "this is history".
- The client's "first words" / "done in" timer shows the real elapsed time, about 0 s. That is the point of the demo.

## Risks / Trade-offs

- [Every deploy empties the runtime cache, even CSS-only ones.] → Accepted (Decision 1). The first visitor to ask each typed question after a deploy pays one live run. Bubbles are unaffected.
- [A plausible but weak first answer is served for the rest of the deploy's life.] → Only grounded, cited, primary-model answers are cached. Any redeploy clears it.
- [Groq rate-limits the build's precompute runs and falls back to the 20B model.] → Those answers fail `isCacheable` and are dropped, so the bubble falls back to live. Runs go sequentially with a gap between them, and `complete()` already retries once.
- [`GROQ_API_KEY` isn't available during the Netlify build.] → The precompute writes empty suggestions and warns. Task 1.3 checks that the env var's scope includes Builds.
- [A Blobs read adds latency to every first-turn miss.] → Usually tens of ms against seconds of agent time. It's shown in the trace as "Cache miss · Nms", so it's observable.
- [The deploy store needs an explicit region at runtime.] → Pass `region` as the adapter does. Verified on a deploy preview in task 4.1.
- [Cache poisoning: a prompt-injected question's answer is cached.] → It can only be served for that exact normalised question, within one deploy, and only if it passed the grounded and cited filter.

## Migration Plan

1. Merge. The first production build precomputes the suggestions. The runtime cache starts empty and fills as visitors ask.
2. Check on the deploy: the build log shows N/4 suggestions precomputed. A bubble click makes no `/api/chat` request (network tab). A repeated typed question shows "Cache hit · runtime" in the trace.
3. Rollback: revert the commit, or publish an earlier deploy. Deploy stores are removed with their deploys, so there's nothing to clean up.
