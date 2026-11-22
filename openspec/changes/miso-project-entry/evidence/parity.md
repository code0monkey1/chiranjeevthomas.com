# Parity check: post → case study

Automated comparison of `evidence/post-before.md` with `content/projects/miso-chat.md` (2026-11-22): headings, table rows, figure sources, widget markers, captions, bullets, numbers and paragraphs, matched verbatim.

| Item | In the post | Missing verbatim | Why |
|---|---|---|---|
| `##` headings | 13 | 1 | "Ask Miso about this post" → "Ask Miso about this project" (self-reference) |
| Table rows | 27 | 2 | "Groq rate limit" row extended with the README's retry detail; "Deploy with changed content" row now says about 11.5K tokens (re-measured) |
| Figure sources (incl. reduced-motion `srcset`s) | 9 | 0 | |
| Widget markers | 3 | 0 | |
| Figure captions | 5 | 0 | |
| Bullets | 11 | 0 | |
| Numbers | — | `57`, `9K` | Replaced by the re-measured 65 chunks / 11.5K tokens (see measurements.md) |
| Paragraphs | — | 3 | Intro ("This post is about" → "This page covers how I built it, and"), the re-embed tradeoff (new corpus figures), the closing "Ask Miso" paragraph ("this post" → "this page") |

Result: nothing from the post was dropped; every difference is an intended self-reference or a re-measured figure.

## Wording changed after the first eval run (task 6.5)

The first live eval run failed 3 checks. The build-story sections quoted the evals' own probe questions verbatim ("What's his favourite pizza?", "where does he work now?", "How does he keep tabs on what an AI is doing behind the scenes?"). Separately, the case study's short chunk titles ("Miso: …", weighted 3× by BM25) gave the word "now" more weight than the post's long titles did, which pushed the experience chunk out of "Where does he work now?". Fixes, all meaning-preserving:

| Where | Before | After |
|---|---|---|
| Heading (from the post) | What Miso's cache does now | How Miso's cache works in production |
| Key-results bullets (from the post) | "Suggestion bubbles **now** answer…", "The chat's vectors **now** belong…" | "now" dropped ("instead of about 2 s" already says it changed) |
| Semantic search (README-derived) | quoted the pizza and "work now" probes, and the word "Present" | paraphrased: "an off-topic question about his food preferences", "questions about his current role" |
| Decisions (README-derived) | quoted the "work now" and "keep tabs" probes | paraphrased |

After the fix: `npm run eval:chat` passes all 110 checks (evidence/eval.txt), and "Where does he work now?" ranks `job-grabbit` first in BM25 again, as it did on `main`.
