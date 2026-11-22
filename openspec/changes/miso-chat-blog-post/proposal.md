# Proposal

## Why

The site's main audience is hiring teams for applied AI engineer roles. What they screen for is evidence that someone can run an LLM agent in production: cost control under hard quotas, latency, failure modes, and tradeoffs argued on evidence. Miso already shows a lot of this, and `cache-miso-answers` and `pin-vectors-to-deploy` add more, but the reasoning lives only in OpenSpec artifacts and the README. A visitor never sees it. A post that walks through how Miso was built, and why each caching and vector decision went the way it did (including the option I first chose and then dropped), turns that engineering into something a recruiter can read in ten minutes and verify by asking Miso itself.

## What Changes

- **New post** `content/posts/how-miso-answers.md` (working title: "Making a free-tier RAG agent fast without serving stale answers"). Its outline:
  - **The constraint:** Groq's 8K tokens a minute, the free Pinecone plan, and the latency of every click before caching.
  - **How a question is answered:** the agent loop, then `search_portfolio`, meaning plus keyword search, rank fusion, and grounded citations.
  - **Why caching an agent is harder than caching an API:** answers depend on conversation history, a bad answer can get frozen, and the trace has to stay honest.
  - **The options I considered:** in-memory, Blobs, build-time, CDN, semantic cache. What each costs, and why semantic caching was rejected.
  - **What shipped:** build-time answers in the bundle, plus a runtime cache scoped to each deploy.
  - **The invalidation decision:** a content fingerprint versus the deploy ID, and why I switched to the deploy ID.
  - **Vectors had the same bug:** a systems view (stocks, flows, the deploy as the boundary) of the build-window, failed-build and rollback problems, and the pruning trap.
  - **Failure modes and the accepted degraded mode.**
  - **Measured results and cost.**
  - **What I'd change at larger scale.**
  - **An invitation to ask Miso about any of it.**
- **Animated, interactive diagrams in the post**, built the way the case studies' widgets are:
  - `miso-question-flow`: step through one question from click to cited answer.
  - `cache-paths`: choose a path (suggestion bubble, repeated question, first-time question, follow-up) and watch it light up the layers, with measured latency and LLM calls.
  - `deploy-timeline`: step through three deploys and a rollback, and see what each part of the system serves, before and after the change.
  - The existing animated SVGs (`miso-pipeline`, `meaning-vs-keywords`, `rank-fusion`) reused. `vector-sync` redrawn for content-addressed namespaces.
- **Widgets in blog posts.** The post page renders `<!-- widget:name -->` markers the way case-study pages do. An unknown widget name fails the build instead of silently disappearing.
- **Motion and accessibility.** The animated SVGs get their own `prefers-reduced-motion` rule, because the site-wide rule can't reach inside an `<img>`. Every diagram has a text alternative, and every widget renders a readable static state without JavaScript.
- **Miso can explain itself.** The system prompt's "questions about you: answer playfully without searching" rule is split in two. Questions about Miso the cat stay playful with no search. Questions about how the chat works must search and cite. The post's sections join the chat's search index like every post does. An eval checks that questions about how Miso caches answers, handles failures or searches come back grounded in the post, and that existing golden questions still reach their usual pages.
- **Only real numbers.** Every figure in the post comes from a measurement (traces, build logs, eval runs) or from the code, and each is logged with its source in the change's tasks. The post ships as `draft: true` until those measurements are taken on production.

## Capabilities

### New Capabilities
- `blog-post-widgets`: Posts can embed interactive and animated diagrams with the same markers as case studies, accessibly and with reduced motion respected.
- `chat-self-knowledge`: Miso answers questions about how it is built (search flow, caching, failure modes, costs) grounded in the site's own write-up, citing it.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/. -->

## Impact

- **Content:** a new post, plus four SVGs copied from `docs/` into `public/media/` (with reduced-motion styles), one of them redrawn.
- **Code:**
  - `app/blog/[slug]/page.tsx`: renders widgets.
  - New `components/widgets/MisoWidgets.tsx`, registered in `components/widgets/Widgets.tsx`.
  - `lib/markdown.ts` or the widget registry: fail on unknown names.
  - Widget CSS in `app/globals.css`.
  - `lib/agent.ts` (`SYSTEM` prompt): **agent behaviour change.** Self-questions about the chat's workings now search.
  - New golden and agent-behaviour cases in `scripts/eval-chat.ts`.
- **Search index:** about 10–12 more chunks (around 3K embedding tokens once). Retrieved tokens per question are unchanged (top 4).
- **Ordering:**
  - The widget infrastructure can ship at any time.
  - The text and numbers depend on `cache-miso-answers` and `pin-vectors-to-deploy` being live in production, because the post reports what they measurably did.
- **No new dependencies.**
