# Measurement log

Every figure the post states must appear here with its source. "Before" rows were taken on the
production deploy that predates `cache-miso-answers`.

## Baseline: before caching

- **Deploy:** `6aeeca6187e1713c8c6069bd` (production, commit `f7665c8`, published 2026-11-07)
- **Measured:** 2026-11-21 19:41–19:49 UTC, from a laptop over the public internet
- **Method:** [`evidence/baseline.mjs`](evidence/baseline.mjs) POSTs each suggestion to `https://www.chiranjeevthomas.com/api/chat` with empty history, 5 rounds, 12 s apart.
  - It times the first visible answer token ("first words") and the `done` event ("total").
  - Raw rows: [`evidence/baseline-2026-11-21.ndjson`](evidence/baseline-2026-11-21.ndjson).
  - These are server-stream timings seen by a client. The chat's own trace header times from the click, so it adds a few ms of UI work.

| Suggestion | Runs | First words (median) | Total (median) | Groq calls | Searches |
|---|---|---|---|---|---|
| What has he shipped with LLMs in production? | 5 | 1,763 ms | 2,020 ms | 2 | 1 |
| How does InvoiceChaser keep a human in the loop? | 5 | 1,761 ms | 2,007 ms | 2 | 1 |
| What’s his experience with RAG? | 5 | 1,627 ms | 2,060 ms | 2 | 1 |
| Is he a fit for a senior full-stack AI role? | 5 | 1,687 ms | 2,028 ms | 2 | 1 |

- All 20 runs were `live`, grounded and on the main model (no rate-limit fallback).
- The first request of the session took **6,526 ms**, a cold function start. It's included in the first row's 5 runs. The median isn't skewed by one outlier, so nothing was removed by hand.
- Groq calls per question = 2 (one round that decides to search, one that writes the answer), read from each run's trace.

## Fixed facts

| Fact | Value | Source (checked 2026-11-22) |
|---|---|---|
| Groq limits for `openai/gpt-oss-120b` (and `gpt-oss-20b`) | 30 requests/min, 1,000 requests/day, 8K tokens/min, 200K tokens/day | https://console.groq.com/docs/rate-limits (table, "base limits") |
| Groq calls per live answer | 2 (decide-to-search round + answer round) | baseline traces above; `runAgent` in `lib/agent.ts` |
| So: live answers per day before hitting the request cap | about 500 (1,000 ÷ 2) | derived from the two rows above |
| Pinecone Starter namespaces per serverless index | 100 | https://docs.pinecone.io/guides/data/implement-multitenancy |
| Corpus with this post | 57 chunks, ~9,297 embedding tokens (≈4 chars/token) | `buildIndex()` after publishing the post, 2026-11-22 |
| Corpus | 43 chunks, ~5,876 embedding tokens (≈4 chars/token) | `sync:vectors` log, `CONTEXT=production`, 2026-11-21: "43 upserted (~5876 tokens embedded)" |
| Full embed of a new namespace vs. unchanged check | ~5.8 s vs ~5.9–6.4 s total sync time; both dominated by list/fetch round trips, plus a 5 s indexing wait only when something was upserted | same `sync:vectors` logs (laptop → Pinecone us-east-1) |
| Production build+deploy time before this change | 65 s (`deploy_time`) | Netlify deploy record `6aeeca6187e1713c8c6069bd` |
| Precompute step (4 suggestions) | 43 s locally (8 s gaps between runs to respect 8K tokens/min) | `npx tsx scripts/precompute-answers.ts`, 2026-11-21 |
| Commits on main, 21 Oct–21 Nov 2026 (non-merge) | 12 total; 6 touched `content/`; 7 touched content or answer code (`lib/agent.ts`, `lib/search-index.ts`, `lib/vector-store.ts`); 5 touched neither | `git log --no-merges --since=2026-10-21 --until=2026-11-22 main` + `git show --name-only` per commit |
| Runtime cache on Netlify (deploy preview 1) | miss lookup 44 ms / 16 ms; hit lookup 52 ms | `/api/chat` traces, deploy preview `6b024e4b`, 2026-11-22 |

## After caching

- **Deploy:** `6b02571400e7bc9010ea99c7` (production, merge commit `0d6d3dd`, published 2026-11-22 02:46 UTC)

| Figure | Value | Source |
|---|---|---|
| Suggestion bubble | 0.0 s ("first words 0.0s · done in 0.0s"), no `/api/chat` request | browser network log + trace header on www.chiranjeevthomas.com, 2026-11-22 |
| Runtime cache, repeated first question | lookups 53, 959, 141, 56, 10 ms (median 56 ms) over 5 hits; end-to-end 0.7–4.8 s from a laptop, dominated by function start-up on fresh instances | `.prod-measure` run, 6 POSTs 15 s apart, 2026-11-22 |
| Runtime cache hit, in the browser | "Cache hit · runtime · 72ms", "done in 0.4s" | trace screenshot `public/media/miso-cache-hit-trace.jpg` |
| Cache miss lookup on production | 96 ms (first request, cold function: 6.3 s total) | same run |
| Production build+deploy time | 88 s (was 65 s): +23 s for the precompute step and the sync stamp | Netlify deploy records `6b025714…` vs `6aeeca61…` |
| Namespace stamps | `production-42f3b881` synced 02:44:51, published 02:46:26 (onSuccess, after publish); legacy `production` untouched; nothing pruned (only one hashed production namespace) | Pinecone `listNamespaces` + profile record metadata |
| Defect caught on the first deploy preview | first questions (cache path) timed out with 504 after ~30 s; follow-ups (no cache) answered in 2.7 s; fixed by the adapter's fetch + region and 1.5 s / 4 s timeouts | curl against deploy-preview-1, Netlify request logs (3 × 504, 30.3–30.6 s), 2026-11-22 |
| Defect caught on production | a precomputed bubble showed raw citations `[job‑grabbit]`: the model used U+2011 hyphens, which `finalize()` didn't parse; fixed + an "answers with raw markers are never cached" guard | page DOM char codes, 2026-11-22 |
