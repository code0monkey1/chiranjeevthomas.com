# Design

## Context

- **Projects** are `content/projects/*.md`, validated by `ProjectSchema` in `lib/content.ts`.
  - A project page (`app/projects/[slug]/page.tsx`) already renders `<!-- widget:name -->` markers and raw HTML `<figure>`s through the same `renderMarkdown` and `splitWidgets` as posts.
  - The `.diagram` figure styles are global.
  - So the post body can move almost unchanged.
- **Card covers:** `ProjectCard` shows `media.video` if set, otherwise a `ProjectDiagram` entry keyed by slug. Those entries are pure CSS animations (`.pd-step` and `.pd-grow` on a 6 s loop), and they are already made static under `prefers-reduced-motion` in `app/globals.css`.
- **Search index** (`lib/search-index.ts`):
  - A project adds a summary chunk with id `<slug>` and one chunk per `##` section with id `<slug>-<i>`, titled with the part of `title` before " — ".
  - The profile chunk about the cat already uses the id `miso`.
- **Agent prompt** (`lib/agent.ts` `SYSTEM`): it says "this chat (Miso) is not one of the projects", and the `project` parameter of `search_portfolio` is described as "omit … for questions about this chat". Both become false once Miso is a project.
- **Evals:** `scripts/eval-chat.ts` hard-codes `POST = "/blog/how-miso-answers"` and checks that the Pinecone question is answered unscoped.
- **The chat** (`components/chat/ChatMiso.tsx`) runs inside a `<dialog>` that `MisoLauncher` mounts in the home hero. Source links in answers are plain `<a href>`, so following one loads a whole new page.
- **Related unarchived changes:** `miso-chat-blog-post` (complete, not archived) defines the `chat-self-knowledge` and `blog-post-widgets` specs, and `chat-self-knowledge` refers to "the write-up post".

## Goals / Non-Goals

**Goals:**
- One canonical page for Miso. Nothing from the post is lost, and the build story and decisions are added.
- The old URL keeps working.
- The chat reliably cites the new page.

**Non-Goals:**
- No new widgets. The three existing Miso widgets are reused as they are.
- No change to the caching or vector machinery itself.
- No demo video for the card. The animated diagram is the cover.
- No change to how other posts or projects render.

## Decisions

### Slug `miso-chat`, title "Miso — the agent on this site"
The slug `miso` would make the project summary chunk's id collide with the existing `miso` profile chunk, and Pinecone record ids must be unique. Renaming the profile chunk instead would change a persona chunk that the evals rely on.

The title's part before " — " ("Miso") becomes the section-chunk title prefix, so chunks read "Miso: Chunking" and so on.

### Front matter

| Field | Value |
|---|---|
| `status` | `Live` |
| `date` | `2026-10-21` (the first commit that shipped Miso) |
| `order` | `3` |
| `types` | `[ai-engineering]` |
| `tags` | `[agents, rag, llm, observability]` (the post's tags, all in `tags.yaml`) |
| `stack` | Next.js 15, Groq · gpt-oss-120b, Pinecone (integrated inference), BM25, Netlify Blobs, Netlify |
| `links.demo` | `https://www.chiranjeevthomas.com/#ask-miso` (the launcher already opens on that hash) |
| `links.github` | the public repo `code0monkey1/chiranjeevthomas.com` |
| `featured` | not set |

The other `order` values shift: agentic-rag becomes 4, agent-observability 5, devreferral 6.

The "Try the live demo" button opens the site's own home page in a new tab. That's acceptable: it's how every other project's demo link behaves.

### Page structure
The project page has no table of contents, so the story is ordered to read top to bottom. The build story comes first and the operations story after it:
1. **Opening and key results:** the post's intro and its three bolded results.
2. **What Miso is:** the README's "Miso in 30 seconds".
3. **The free-tier constraint.**
4. **How Miso answers a question:** the question-flow widget, the three figures, then conversation memory.
5. **Chunking:** one idea per chunk, with the measured strategy table.
6. **Semantic search and the 0.15 score floor.**
7. **Decisions I measured:**
   - local embeddings → Pinecone
   - no reranker
   - unweighted rank fusion
   - agent query rewriting
   - Groq model choice
8. **The chat experience:** the trace, the chase loader, the launcher modal.
9. **The caching story:**
   - why caching an agent is harder than caching an API
   - the five caching options
   - the cache-paths widget and the cache-hit screenshot
   - the cache key decision I reversed
10. **The vectors story:**
    - the deploy-timeline widget
    - the vector-sync figure
    - the re-embed tradeoff
    - pruning and the trap
11. **Guardrails and failure modes:** the post's failure table merged with the README's guardrails (rate limits, prompt injection, off-topic handling). Every row is kept, and duplicate rows are merged.
12. **Evals.**
13. **What it cost and what it bought.**
14. **What I'd do at 1,000x the traffic.**
15. **Ask Miso about this project.**

Keeping the post's own headings for the sections it already had makes the parity check mechanical. Section text is carried over word for word except where it refers to itself ("this post" becomes "this page" or "this project").

Alternative considered: keep the post's order and add the build story at the end. I rejected it because a recruiter would meet caching before understanding what is being cached.

### Numbers
The post's and README's figures are kept as measured, with their "as of November 2026" note. Two figures describe the index itself and will change with this change:
- the chunk count
- the full-embed token count ("57 chunks, about 9K tokens"; the README says 40 chunks and about 3,400 tokens)

These are recomputed from `buildIndex()` after the new page exists and updated in the page. The README's 9-question strategy table is a historical measurement and is labelled with when it was taken, not re-run.

### Cover: a `MisoChat` entry in `ProjectDiagram`
It reuses the existing `pd` primitives so it matches the other covers. The animation, on one 6 s loop:
1. A question bubble appears: "How does Miso cache answers?".
2. A `search_portfolio` node appears.
3. Two short lanes grow: "meaning · Pinecone" and "keywords · BM25".
4. The lanes merge into an "RRF top 4" pill.
5. An answer bubble appears with a source chip ("↗ Miso: caching") and a green `cache hit · 60 ms` chip.

It needs only a few new classes, scoped under `.pd-miso`, and the existing mobile rule (`.project-media:has(.pd) { aspect-ratio: 4/3 }`) covers phones.

Alternative considered: an animated SVG like the post figures. I rejected it because the CSS covers already handle theming, reduced motion and text alternatives (`role="img"` plus `aria-label`) consistently.

### Chat link: in the chat bar and in the trace note
- **Chat bar:** a text link "How I built Miso" before the mode pill, pointing to `/projects/miso-chat`. It's a plain `<a>` (a full page load), like the source links, so leaving the home page tears the dialog down cleanly.
  - A client-side `<Link>` would unmount the dialog without firing `close`. That would leave the `dialog-open` class on `<html>`. We'd have to call `onClose` first, and it would gain nothing, because the conversation lives in the home page and is lost either way.
  - On screens narrower than 640px the label shortens to "How it’s built" and the chat-title subtitle may truncate, so the bar never wraps its controls.
- **Trace note:** a second link at the end of the how-it-works note: "Read how it was built and the decisions behind it →".
- Neither link opens a new tab. Internal links on this site stay in the same tab.

Alternative considered: a fifth suggestion bubble, "How was Miso built?". I rejected it because a bubble answers in chat, while the request is to reach the decisions page. It would also add a precomputed answer and change the bubble layout.

### Removal and redirect
- `content/posts/how-miso-answers.md` is deleted.
- A `{ source: "/blog/how-miso-answers", destination: "/projects/miso-chat", permanent: true }` entry is added to `redirects()` in `next.config.ts`. Netlify's Next.js adapter serves these redirects.
- The blog route has `dynamicParams = false`, so without the redirect the old URL would 404.
- RSS, the sitemap and the Writing list derive from `getPosts()`, so they drop the post automatically. `/blog` still lists `langchain-tool-gating`.

### Agent: Miso's own project is allowed as a scope
The `SYSTEM` rule changes from "Search them without a project: this chat (Miso) is not one of the projects…" to roughly: "Search them unscoped or scoped to `miso-chat`, Miso's own project. Never scope them to another project, even when the question names a tool that project also uses, such as Pinecone."

The `project` parameter description changes the same way. Both an unscoped search and a `miso-chat`-scoped search reach the case study's chunks, so the eval accepts either but fails on any other scope.

Alternative considered: keep forcing unscoped searches. It works, but the prompt would say something false ("not one of the projects") right next to an enum that lists `miso-chat`, and contradictions like that are what made the model mis-scope before.

### Reconciling the earlier change's spec
`miso-chat-blog-post` should be archived before this change. Its `chat-self-knowledge` spec then lands in `openspec/specs/`, and its wording "the write-up post" is edited there to "the Miso case study". This change's `miso-case-study` spec owns the new citation requirement.

Alternatives considered:
- Writing a MODIFIED delta now. It can't validate against an empty `openspec/specs/`.
- Leaving the old spec untouched. It would then contradict the live behaviour.

## Risks / Trade-offs

- **[Old inbound links and RSS readers]** RSS subscribers lose the item, and anyone with the post bookmarked lands on a different page type. → The permanent redirect keeps links working. The site is new, so the RSS audience is negligible.
- **[Retrieval drift]** About 25 new Miso chunks could crowd other projects out of the top 4 for general questions ("what has he shipped with LLMs?"). → The existing retrieval golden set and the precomputed bubble answers are checked after the change. If a case regresses, the build-story sections are tightened or merged rather than the ranking changed.
- **[Self-scoped searches skip the 0.15 floor]** Project-scoped searches don't apply `MIN_SCORE`, so a `miso-chat`-scoped search always returns something. → This only happens for questions about Miso, and the answer must still cite retrieved chunks. The eval checks grounding.
- **[One very long page]** The case study is far longer than the other case studies. → Short sections, the existing widgets breaking up the text, and an opening that lets a skimmer stop after the key results and "What Miso is".
- **[A full re-embed]** The content change creates a new namespace and embeds the whole corpus once (well within the free tier). → This is expected behaviour of per-version namespaces.
- **[Crowded chat bar on phones]** The extra link could squeeze the title. → Short label and truncation under 640px, verified at 360px.

## Migration Plan

1. Archive `miso-chat-blog-post`, `cache-miso-answers` and `pin-vectors-to-deploy` so their specs are in `openspec/specs/`, and update the "write-up post" wording.
2. Implement the change on a branch and run `npm run eval:chat` (offline checks plus live checks with keys) and `npm run build`.
3. Check the deploy preview:
   - the redirect
   - the card cover, in both themes and with reduced motion
   - the chat links at 360px
   - the self-questions citing `/projects/miso-chat`
4. Publish.

**Rollback:** Netlify's "publish previous deploy" restores the post, the old pages, their cached answers and their vector namespace together, because all of them are scoped to the deploy.
