# Measurements

| Figure in the case study | Value | Source |
|---|---|---|
| Corpus with the case study | 65 chunks, ~11,566 embedding tokens ("about 11.5K") | `buildIndex()` on branch `feat/miso-project-entry`, 2026-11-22, tokens counted as `Σ(title + text + 2) / 4`, the same formula `scripts/sync-vectors.ts` logs |
| Miso's own chunks | 22 chunks (`miso-chat` + 21 sections), ~5,626 tokens | same run, filtered on `project === "miso-chat"` |
| Corpus before the write-up existed | 43 chunks, ~5,876 tokens ("about 6K") | carried over from `archive/2026-11-22-miso-chat-blog-post/measurements.md` (production `sync:vectors` log, 2026-11-21) |
| Index when the chunking strategy was chosen | 40 chunks, ~3,400 tokens | README "Chunking" section (historical, labelled as such on the page) |
| Strategy comparison table (8/9, 0.89, ~410 …) | historical | README "Chunking" section, not re-run (design.md: labelled as an earlier measurement) |
| Rate-limit defaults (30 per IP a day, 500 overall) | 30 / 500 | `app/api/chat/route.ts` lines 9 and 11 |
| History length (last 8 messages) | 8 | `lib/agent.ts:232`, `components/chat/ChatMiso.tsx:133` |
| Max searches per question | 3 | `lib/agent.ts:32` (`MAX_SEARCHES`) |

The "57 chunks, about 9K tokens" figure from the post was replaced because it described the index with the post included, and the post is gone. All latency, call-count and build-time figures are unchanged from the post (see the archived change's measurements log).
