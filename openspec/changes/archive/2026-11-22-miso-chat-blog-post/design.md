# Design

## Context

- **Rendering:**
  - Posts render through `renderMarkdown()` only. `app/blog/[slug]/page.tsx` never calls `splitWidgets()`, so widget markers in a post are dropped today.
  - Case studies (`app/projects/[slug]/page.tsx`) split on `<!-- widget:name -->` and render `Widget` from `components/widgets/Widgets.tsx`. Its registry returns `null` for an unknown name, so a typo makes a diagram disappear silently.
- **The existing animations:**
  - Interactive widgets are client components with CSS animations (`pop`, `chipIn`, the `pd-*` keyframes).
  - A global `prefers-reduced-motion` rule turns off CSS animation site-wide.
  - The four README diagrams (`docs/*.svg`) animate with **SMIL** (`<animate>`), which a page's CSS can't stop inside an `<img>`.
- **How the post feeds Miso:** `buildIndex()` makes one chunk per `##` section of each post. It strips HTML comments, code blocks and Markdown symbols, and table pipes become spaces. So every `##` section of this post becomes a retrievable passage, and should make sense on its own.
- **House style:** the existing post (`langchain-tool-gating.md`) is first person and concrete, links to the code, uses short sections and ends with "Takeaways". The README already holds measured decisions (chunking strategies, the reranker rejected, RRF weights), and the post can reuse them.
- **The repository is public** (`code0monkey1/chiranjeevthomas.com`), so the post can link to exact files.

## Goals / Non-Goals

**Goals:**
- A hiring manager gets the point in about 30 seconds (a TL;DR with real numbers) and the full reasoning in about 10 minutes.
- Every tradeoff is shown with what it cost and why it won, including the decisions I reversed.
- The diagrams teach by interaction (step through one question, compare cache paths, replay a rollback), not decoration.
- Miso can answer questions about the post's subject and cite it, which is a live demo of the thing the post describes.

**Non-Goals:**
- A Miso case-study page under `/projects` (see Open Questions).
- Migrating content to MDX.
- Changing the chat's suggestion bubbles, or adding deep links into the chat.
- Writing about features that aren't shipped.

## Decisions

### 1. Reuse the case-study widget pipeline for posts

`PostPage` renders `splitWidgets(await renderMarkdown(p.body))` the same way `ProjectPage` does.
- **Alternative considered:** MDX. It adds a dependency and a second content format, and changes how every page is built, all for three widgets.

### 2. Unknown widget names fail at content load

- Widget names move to a plain module (`components/widgets/names.ts`, an exported `WIDGET_NAMES` array), which the client registry and `lib/content.ts` both import.
- `getPosts()` / `getProjects()` scan bodies for markers and throw on an unknown name. This mirrors how unknown tags already fail the build.

### 3. Three new widgets, one data module

They live in `components/widgets/MisoWidgets.tsx` and are registered in `Widget`.

- **`miso-question-flow`** is a stepper through one real question:
  1. Click.
  2. The LLM decides whether to search.
  3. `search_portfolio(query, project?)`.
  4. Meaning search and keyword search in parallel.
  5. RRF top 4.
  6. The answer with `[chunk-id]` citations.
  7. `finalize()` drops invented citations.
  8. Sources shown.

  Each step shows what happens, the code location, and its measured time.
- **`cache-paths`** has one row of layers (bundle, `/api/chat`, deploy store, rate limiter, Groq, Pinecone) and four chips: suggestion bubble, repeated first question, new first question, follow-up. Picking a chip animates the request through the layers it touches (lit) and past the ones it skips (dimmed). A readout gives latency, LLM calls, Pinecone queries and whether the visitor's quota is used.
- **`deploy-timeline`** steps through: D1 deploys, D2 deploys, D3 builds (the build window), D3 is published, roll back to D2. A before/after toggle switches between today's single mutable namespace and the content-addressed version. For each step it shows what the live site serves (pages, precomputed answers, answer store, namespace), and marks mismatches.

**Shared conventions for the widgets:**
- Each one server-renders its default step, so it's readable without JavaScript.
- Its current state is mirrored in an `aria-live` text region.
- Controls are at least 44 px tall.
- Auto-play is opt-in through a Play button that also pauses (motion longer than 5 s must be pausable).
- Steps animate with the existing `pop` / `chipIn` keyframes, which the global reduced-motion rule already covers.

**The data module:** every figure a widget shows comes from `components/widgets/miso-figures.ts`, which is filled from the measurement log (Decision 6). The prose quotes the same values, so the post and its widgets can't disagree.

### 4. SMIL diagrams: a `<picture>` with a static fallback

- Copy `miso-pipeline`, `meaning-vs-keywords` and `rank-fusion` into `public/media/`, and redraw `vector-sync` for content-addressed namespaces.
- For each one, generate a static final-frame variant (`*-static.svg`). A script strips the `<animate>` elements and applies each animation's final `to`/`values`.
- Embed them in the post as raw HTML (`allowDangerousHtml` is already on):
  ```html
  <picture>
    <source media="(prefers-reduced-motion: reduce)" srcset="/media/rank-fusion-static.svg">
    <img src="/media/rank-fusion.svg" alt="…what the diagram shows…" loading="lazy">
  </picture>
  ```
- **Alternative considered:** converting SMIL to CSS animations inside the SVG. That's more rework, and `@media` inside an SVG-as-image is less consistently honoured than `<picture>` source selection.

### 5. Write every `##` section so it works as a retrieval chunk

- Each section names Miso and its subject explicitly ("Miso's runtime cache…", not "it…") and stays under about 250 words. Use `###` for structure inside a section, because only `##` splits chunks.
- Tables are fine: they flatten to text.
- This is what makes the chat-self-knowledge requirement work without changing any search code. The post is also its own test case.

### 5a. Split Miso's "questions about you" rule

`SYSTEM` in `lib/agent.ts` currently says: "Questions about you (Miso): you're his Ragdoll cat and this chat's assistant; answer briefly and playfully without searching." Under that rule, "How does Miso cache answers?" gets a playful, uncited reply, and the self-knowledge requirement fails however well the post is written. The rule splits in two:
- **Miso the cat** ("who are you?", "are you a real cat?"): unchanged. Playful, brief, no search.
- **How this chat works** (its search, caching, failures, cost, stack): a factual question about Chiranjeev's work like any other. It must call `search_portfolio` and cite.

Evals cover both directions, so the playful persona doesn't regress. This changes agent behaviour, so the blog change carries agent evals and isn't content-only.

### 6. Editorial structure for the hiring audience

```
TL;DR for hiring managers          3 bullets, each with a measured number
## The constraint                  Groq free tier 8K tokens/min, Pinecone Starter, latency before caching (baseline)
## How Miso answers a question     widget: miso-question-flow; SVGs: meaning-vs-keywords, rank-fusion
## Why caching an agent is hard    history-dependence, frozen bad answers, honest traces
## Five ways to cache it           table: in-memory / Blobs / build-time / CDN / semantic, with tradeoffs and the choice
## What shipped                    widget: cache-paths
## The decision I reversed         content fingerprint vs deploy ID: the argument, the data (5 of 12 commits touched nothing an answer depends on), the switch
## The vectors had the same bug    systems view (stocks, flows, the deploy as boundary); widget: deploy-timeline
## Pruning, and a trap I nearly shipped   "Seeking the Wrong Goal": stamp-at-build vs live; onSuccess fix
## When things break               failure-mode table incl. accepted degraded mode and the cache guard
## What it cost and what it bought measured before/after table
## What I'd do at 1,000x traffic   semantic cache with a verifier, shared KV with TTLs, hit-rate dashboards, eval-gated writes;
                                   content-addressed vector records + per-deploy manifest (embed only changed chunks), with
                                   the measured switch trigger from pin-vectors-to-deploy Decision 5 and why copy-forward was rejected
## Ask Miso                        invitation: "ask it how its cache works" (and it will cite this post)
```

- The systems section cites Donella Meadows, *Thinking in Systems: A Primer* (2008), and uses her terms only as defined there: stocks, flows, balancing loop, delays, system boundary, the "Seeking the Wrong Goal" trap, and the information-flows leverage point.
- Code links are GitHub permalinks at the merge commit, so they don't rot.
- Front matter: tags `[ai-engineering, agents, rag, llm, observability]` (all exist in `tags.yaml`), no `project:` (Miso has no project entry), and `draft: true` until measurements are in.

### 7. A measurement log before any prose

`openspec/changes/miso-chat-blog-post/measurements.md` records each figure with how it was measured, its value and its source: trace screenshot, build-log line, eval output, provider docs URL, or code line.

**The baseline has to be captured before `cache-miso-answers` reaches production**, otherwise "before" can't be measured honestly. So that's task 1.1, and it can run today. The figures:

| Figure | How it's measured |
|---|---|
| First words and total time per suggestion | median of 5 runs, read from the trace header |
| Groq rounds per question | from the trace |
| Tokens per question | from Groq's `usage` on a scratch measurement run |
| Bubble click time after the change | the client timer |
| Runtime cache hit and miss lookup times | the trace steps |
| Embedding tokens per content deploy | computed from the chunks, cross-checked with Pinecone's usage page |
| Build-time precompute duration | build log |
| Namespace count | Pinecone console |

## Risks / Trade-offs

- [Post chunks outrank project chunks for general questions, such as a RAG question landing on the post instead of `/projects/agentic-rag`.] → The existing golden set must still pass. If a case regresses, rewrite the offending section to be about Miso specifically rather than RAG in general. Don't widen the accepted pages.
- [The numbers go stale as the code changes.] → Every figure carries an "as of <date>" in the post, comes from one data module, and the measurement log says how to re-measure.
- [The baseline is missed because the cache ships first.] → Task 1.1 is first and blocking. If the baseline is missed, measure it on a deploy permalink of a pre-cache deploy, which stays reachable.
- [The widgets add client JavaScript to the post page.] → They're small and dependency-free, like the existing ones, and only load where they're used.
- [Too long for a recruiter.] → The TL;DR carries the pitch, each section stands alone, and the table of contents (already shown for posts with more than one `##`) lets readers jump.
- [Over-claiming.] → The figure rule (spec) plus Miso's own grounding rules: the post states what was built and measured, and labels the "1,000x" section as future design.

## Migration Plan

1. Ship the widget infrastructure (blog widget rendering, the unknown-name check, reduced-motion SVG handling) at any time. It's invisible until a post uses it.
2. Capture the baseline now (task 1.1).
3. After both caching changes are live, measure, write, review, set `draft: false`, and deploy. The next build adds the post's chunks to the index.

## Open Questions

- Should one suggestion bubble become "How does Miso cache answers?" once the post is live? It would show the self-knowledge feature on the first click, at the cost of one recruiter-facing starter question. This can be decided after launch without changing these specs.
- Should Miso get its own `/projects` case study that this post links to? It's deferrable, and the post stands alone.
