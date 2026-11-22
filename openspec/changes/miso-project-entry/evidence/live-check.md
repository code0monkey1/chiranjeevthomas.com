# Live check (task 8.1), production, 2026-11-22

Checked on https://www.chiranjeevthomas.com after `main` (e568425) was deployed. Production, not a deploy preview: the branch was merged before any preview was built.

| Check | Result |
|---|---|
| `/blog/how-miso-answers` | 308 → `/projects/miso-chat` |
| `/projects/miso-chat` | 200; latest content live ("Fallback answers: cache now, upgrade later", "66 chunks", "Decisions I measured") |
| Figures | all four animated SVGs and their `-static` reduced-motion versions referenced |
| `/blog`, `rss.xml`, `sitemap.xml` | old post absent; sitemap lists `/projects/miso-chat` |
| Home grid | Miso third after InvoiceChaser; cover animates; `aria-label` present; "How it works" → `/projects/miso-chat`; no horizontal scroll |
| Chat link | "How I built Miso, and why →" in the chat bar and the trace-note link present; clicking lands on `/projects/miso-chat`, page not scroll-locked |
| "How does Miso cache answers?" | gpt-oss-120b, grounded, cites `/projects/miso-chat`; search `project: miso-chat` |
| "What happens to Miso if Pinecone goes down?" | gpt-oss-120b, grounded, keyword fallback described, cites `/projects/miso-chat`; search `project: miso-chat` (never another project) |
| "Who are you?" | in character, no search |

The two self-questions were served from the runtime cache (39–43 ms) on the recorded run because an earlier run of the same check (whose output was lost to a parsing error in my script) had just answered them live; the cached entries replay that original run's steps, shown above.
