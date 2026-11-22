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
| Corpus | 43 chunks, ~5,876 embedding tokens (≈4 chars/token) | `sync:vectors` log, `CONTEXT=production`, 2026-11-21: "43 upserted (~5876 tokens embedded)" |
| Full embed of a new namespace vs. unchanged check | ~5.8 s vs ~5.9–6.4 s total sync time; both dominated by list/fetch round trips, plus a 5 s indexing wait only when something was upserted | same `sync:vectors` logs (laptop → Pinecone us-east-1) |
| Production build+deploy time before this change | 65 s (`deploy_time`) | Netlify deploy record `6aeeca6187e1713c8c6069bd` |
| Precompute step (4 suggestions) | 43 s locally (8 s gaps between runs to respect 8K tokens/min) | `npx tsx scripts/precompute-answers.ts`, 2026-11-21 |
| Runtime cache on Netlify (deploy preview 1) | miss lookup 44 ms / 16 ms; hit lookup 52 ms | `/api/chat` traces, deploy preview `6b024e4b`, 2026-11-22 |

## After caching

<!-- Filled by task 5.1 once cache-miso-answers and pin-vectors-to-deploy are live. -->
