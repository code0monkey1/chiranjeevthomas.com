# Tasks

## 1. Setup

- [x] 1.1 Add `@netlify/blobs` (latest stable major) as a dependency and verify `npm install` succeeds and `import { getDeployStore } from "@netlify/blobs"` type-checks (`npx tsc --noEmit`)
- [x] 1.2 Add `lib/generated/` to `.gitignore` and verify `git status` does not show a generated file after running the precompute script
- [x] 1.3 Confirm in the Netlify UI (or `netlify env:list`) that `GROQ_API_KEY` and `PINECONE_API_KEY` are scoped to Builds as well as Functions; record the result in the PR description — verified 2026-11-22: the deploy-preview build precomputed all 4 suggestions (bubble trace "Cache hit · build-time, answered 2026-11-22"), which needs GROQ_API_KEY and PINECONE_API_KEY at build time

## 2. Shared answer-cache primitives

- [x] 2.1 Move `SUGGESTIONS` from `components/chat/ChatMiso.tsx` to `lib/suggestions.ts` and import it back in the component; verify the chat still renders the same four bubbles (`npm run dev`, visual check)
- [x] 2.2 Add `model` to `AgentResult` in `lib/agent.ts` (the model that produced the final message, tracking the 429 fallback) and export a `notCovered(answer)` helper used by `runAgent`; verify the existing `npm run eval:chat` cases still pass and add a case asserting `model === FALLBACK_MODEL` when the mocked first call returns 429
- [x] 2.3 Create `lib/answer-cache.ts` with `normalizeQuestion`, `isCacheable`, `questionKey(question)` and `cachedTrace(result, source, ms)`; add eval cases for: case/whitespace/trailing-punctuation/curly-quote normalisation, the key containing no question text, `isCacheable` rejecting demo, ungrounded, no-source, not-covered and fallback-model results, and the cache-hit trace shape (cache-hit step first, original steps demoted to `step`)

## 3. Build-time suggested answers

- [x] 3.1 Make `scripts/sync-vectors.ts` wait ~5 s before exiting when it upserted anything; verify by log output on a run with a content edit
- [x] 3.2 Write `scripts/precompute-answers.ts`: runs `runAgent` sequentially for each suggestion with a gap between runs, keeps only `isCacheable` results, writes `lib/generated/answers.json` (`{ builtAt, suggestions }`), warns and exits 0 on any failure, and supports `--skip-llm` (writes empty suggestions without calling Groq); verify with `npx tsx scripts/precompute-answers.ts` (with keys: N/4 kept and logged; with `GROQ_API_KEY` unset: empty suggestions, exit 0)
- [x] 3.3 Wire scripts in `package.json`: `precompute:answers`, `prebuild` = `sync:vectors && precompute:answers`, `predev` and `preeval:chat` = `precompute:answers --skip-llm` (so the gitignored module exists for dev, evals and type-checking); verify `npm run build` produces the file before `next build`, and on a clean checkout `npm run dev` starts and `npm run eval:chat` resolves the import
- [x] 3.4 In `ChatMiso.tsx`, before posting, match `normalizeQuestion(q)` against the precomputed suggestions; on a match, render the answer, sources and `cachedTrace(..., "build")` with no fetch, set mood from `grounded`, and record elapsed time; verify in the browser network tab that clicking a bubble (fresh chat and mid-conversation) sends no `/api/chat` request, and that a bubble missing from the file still answers live

## 4. Runtime cache in the chat route

- [x] 4.1 Add a deploy-store wrapper in `lib/answer-cache.ts` (`getDeployStore("miso-answers")` with a `no-store` fetch, disables itself on `MissingBlobsEnvironmentError`, every get/set wrapped in try/catch, accepts an injected store for tests); add an eval case using an in-memory fake proving a thrown read is treated as a miss and a thrown write does not throw; on the first deploy preview, verify reads and writes succeed without a region error (pass `region` explicitly, as the adapter does, if they don't) — first preview returned 504s on first questions; fixed by using the adapter's fetch + region and adding 1.5s/4s timeouts; second preview: miss 44ms, hit 52ms
- [x] 4.2 In `app/api/chat/route.ts`, for empty-history questions, look up the key before `limited()`; on a hit, stream the `Cache hit · runtime · Nms` step and the `done` result and return; on a miss, add a `Cache miss · Nms` trace step; verify against the fake store that a hit bypasses the rate limiter and never calls the model
- [x] 4.3 After sending `done` and closing the stream, schedule the write with `after()` from `next/server` when history is empty and `isCacheable(result)`; verify against the fake store that follow-up turns neither read nor write, that a fallback-model answer is not written, and that the stream closes before the write finishes

## 5. Docs

- [x] 5.1 Update the "How it works" text in the chat trace panel and the README (if it describes the chat pipeline) to mention build-time answers and the per-deploy runtime cache; verify the copy renders in both live and demo modes

## 6. Integration verification

- [x] 6.1 `npm run eval:chat` and `npx tsc --noEmit` pass; `npm run build` succeeds both with and without `GROQ_API_KEY`
- [x] 6.2 On a Netlify deploy preview: the build log shows suggestions precomputed; bubble clicks make no API call; asking the same typed question from two browsers shows `Cache hit · runtime` on the second; a follow-up question is answered live
- [ ] 6.3 Redeploy the preview (any change) and verify the previously cached typed question is a cache miss on the new deploy, while the old deploy's permalink (`<deploy-id>--<site>.netlify.app`) still serves it as a cache hit

## Workflow follow-up

- Review the deploy-preview results, merge, and archive the change with `/opsx:archive` once production is verified.
