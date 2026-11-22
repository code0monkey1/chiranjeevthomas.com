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
