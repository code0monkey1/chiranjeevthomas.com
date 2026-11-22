# Proposal

## Why

Miso is the most complete piece of AI engineering on the site: a live tool-calling RAG agent with hybrid search, grounded citations, caching, per-deploy vectors and evals. Yet it shows up only as a blog post, not in the Projects grid where hiring teams look first. Turning that post into a project case study puts Miso next to InvoiceChaser and the RAG assistant, with an animated cover like theirs. It also gives the build story one home: how Miso was made (chunking, search, the agent loop, the chat UI, evals) plus everything the post covers about caching and vectors.

## What Changes

- **New case study** `content/projects/miso-chat.md`, shown at `/projects/miso-chat`. It contains:
  - **Everything in the current post, with nothing dropped:**
    - the free-tier constraint and the latency measured before caching
    - how a question is answered
    - why caching an agent is hard
    - the five caching options
    - what the cache does now, including the 504 incident and the Unicode-hyphen bug
    - the cache key decision I reversed
    - the vector bug, its systems framing and the fix
    - the re-embedding tradeoff
    - pruning and the "wrong goal" trap
    - the failure table and the before/after numbers
    - the 1,000x plans
  - **All of the post's figures and widgets:**
    - the animated SVG figures, with their reduced-motion versions: `miso-pipeline`, `meaning-vs-keywords`, `rank-fusion` and `vector-sync`
    - the cache-hit trace screenshot
    - the `miso-question-flow`, `cache-paths` and `deploy-timeline` widgets
  - **How Miso was built, written up from the README and code** (it isn't in the post today):
    - **What Miso is:** a 30-second overview.
    - **Chunking:** one idea per chunk, and the strategy comparison measured against the alternatives.
    - **Semantic search:** Pinecone integrated inference and the 0.15 score floor.
    - **Conversation memory:** how follow-up questions are resolved.
    - **The chat experience:** the agent trace, the loader and the launcher.
    - **Guardrails:** rate limits and prompt injection.
    - **The eval suite.**
    - **Decisions I measured:** local embeddings dropped, no reranker, plain rank fusion, query rewriting, and the Groq model choice.
- **Animated cover for the project card**: a new `miso-chat` entry in `components/ProjectDiagram.tsx` in the existing `pd` style. A question bubble leads to a `search_portfolio` call, meaning and keyword lanes merge, and a cited answer appears with a cache-hit chip. It loops, shows a static frame under reduced motion, and fits the card's 16:9 frame (4:3 on phones).
- **Link from the chat to the case study**: a "How I built Miso" link in the chat bar, visible before and during a conversation, plus one at the end of the trace's how-it-works note. A recruiter talking to Miso can open the decisions behind it in one click. It fits the chat bar at phone width.
- **Placement**: the card sits third, after InvoiceChaser (`order: 3`). The RAG assistant, observability and DevReferral cards move down one place.
- **BREAKING (URL): the post is removed.**
  - `content/posts/how-miso-answers.md` is deleted.
  - `/blog/how-miso-answers` permanently redirects to `/projects/miso-chat`.
  - The post leaves the Writing list, RSS and sitemap, and the project page takes its place in the sitemap.
- **Miso cites the case study.** Questions about how the chat works are answered from and cite `/projects/miso-chat`.
  - The system prompt's "this chat (Miso) is not one of the projects" rule changes: a self-question may scope its search to `miso-chat` or stay unscoped, but never to another project.
  - The evals that expected `/blog/how-miso-answers` now expect the case study.

## Capabilities

### New Capabilities
- `miso-case-study`: Miso is presented as a project, with a case study covering how it was built and everything from the former write-up, an animated card cover, a link to the case study from the chat, a redirect from the old post URL, and chat answers about Miso that cite it.

### Modified Capabilities
<!-- None in openspec/specs/ (it is empty). The unarchived change miso-chat-blog-post defines
     chat-self-knowledge in terms of "the write-up post"; design.md covers how that wording is reconciled. -->

## Impact

- **Content:**
  - new `content/projects/miso-chat.md`
  - `content/posts/how-miso-answers.md` deleted
  - `order` bumped in `agentic-rag.md`, `agent-observability.md` and `devreferral.md`
- **Code:**
  - `components/ProjectDiagram.tsx`: the new cover
  - `app/globals.css`: cover styles
  - `components/chat/ChatMiso.tsx`: the link to the case study
  - `next.config.ts`: the redirect
  - `lib/agent.ts`: the self-question scoping rule. **This changes agent behaviour.**
  - `scripts/eval-chat.ts`: expected URLs and the scoping check
- **Search index:**
  - Post chunks (`post-how-miso-answers-*`) are replaced by project chunks (`miso-chat`, `miso-chat-*`).
  - There will be more chunks than today because of the build-story sections, so the content hash changes and a new namespace is fully embedded once (about 9K+ tokens).
  - Precomputed bubble answers are rebuilt at build time as usual.
- **Home grid:**
  - With 6 projects, the "All" tab switches from the featured layout to two columns.
  - The AI engineering tab (5 projects) uses the featured layout.
- **No new dependencies.**
