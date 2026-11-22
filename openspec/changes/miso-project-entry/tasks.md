# Tasks

## 1. Prepare

- [x] 1.1 Archive `miso-chat-blog-post`, `cache-miso-answers` and `pin-vectors-to-deploy` (all tasks complete) so their specs land in `openspec/specs/`. In `openspec/specs/chat-self-knowledge/spec.md`, change "the write-up post" / "the write-up" to "the Miso case study (`/projects/miso-chat`)".
- [x] 1.2 Work only in the worktree `../chiranjeevthomas.com-miso` (branch `feat/miso-project-entry`, created from `main` at 92e10ec). Save a copy of the current `content/posts/how-miso-answers.md` to the change folder as `evidence/post-before.md`, to use for the parity check.

## 2. Case study content

- [x] 2.1 Create `content/projects/miso-chat.md` with the front matter from design.md:
  - title "Miso — the agent on this site", plus a headline, summary and description
  - status Live, date 2026-10-21, order 3
  - types `[ai-engineering]`, tags `[agents, rag, llm, observability]`
  - the stack list
  - `links.demo` = `https://www.chiranjeevthomas.com/#ask-miso`, `links.github` = the repo URL
- [x] 2.2 Move the post body into the page in the section order from design.md, keeping:
  - the post's headings
  - all four `<figure class="diagram">` blocks with their reduced-motion `<source>`s
  - the cache-hit screenshot
  - the `miso-question-flow`, `cache-paths` and `deploy-timeline` markers
  - every table

  Change only self-references ("this post" becomes "this page" or "project"), including the closing "Ask Miso about this project" section.
- [x] 2.3 Write the build-story sections from the README and code:
  - What Miso is
  - Conversation memory
  - Chunking, with the strategy table labelled as an earlier measurement
  - Semantic search and the 0.15 floor
  - Decisions I measured (5 items)
  - The chat experience (trace, loader, launcher)
  - Evals
  - Guardrails merged into the failure table (rate limits, prompt injection, off-topic handling)

  Use only figures that are stated in the README, the post or the code.
- [x] 2.4 Bump `order` in `agentic-rag.md` to 4, in `agent-observability.md` to 5 and in `devreferral.md` to 6.
- [x] 2.5 Delete `content/posts/how-miso-answers.md`.
- [x] 2.6 Run `buildIndex()` (from a one-off `tsx` script in the scratchpad, or from the eval output) to get the new chunk count and full-embed token estimate. Update the "57 chunks, about 9K tokens" sentence and the matching tradeoff text to the new figures, keeping the old figures as "before". Log the source in `evidence/measurements.md`.
- [x] 2.7 Parity check: compare `evidence/post-before.md` with the new page and confirm that every heading, table row, figure, widget marker and number is present. Record the result in `evidence/parity.md`.

## 3. Animated card cover

- [x] 3.1 Add `MisoChat` to `components/ProjectDiagram.tsx`, registered as `"miso-chat"`, with:
  - the question bubble
  - the `search_portfolio` node
  - the meaning and keyword lanes (`.pd-grow`)
  - the "RRF top 4" pill
  - the answer bubble with a source chip and a `cache hit · 60 ms` chip
  - `role="img"` and a descriptive `aria-label`
- [x] 3.2 Add the `.pd-miso` styles to `app/globals.css`, using existing tokens only, and a phone tweak inside the existing ≤640px block if needed.
- [x] 3.3 Check the cover in light and dark themes, with reduced motion on (all steps visible and static), and at 360px, 768px and desktop widths (nothing clipped, no horizontal scroll).

## 4. Link from the chat

- [x] 4.1 In `components/chat/ChatMiso.tsx`, add a plain `<a href="/projects/miso-chat">` reading "How I built Miso" to the chat bar. (Placed as its own line under the chat title rather than before the mode pill: a link in the bar row squeezed the title to nothing at 360px.)
- [x] 4.2 At the end of the trace's how-it-works note, add "Read how it was built and the decisions behind it →", linking to the same page.
- [x] 4.3 Style the link in `app/globals.css`: keyboard focus ring (the site-wide `:focus-visible` rule), and a shorter label under 640px ("How I built Miso →" instead of "How I built Miso, and why →") so the controls never wrap.
- [x] 4.4 Verify at 360px and on desktop: the link is visible and reachable with Tab, clicking it lands on `/projects/miso-chat`, and the page is not left scroll-locked.

## 5. Redirect

- [ ] 5.1 Add `{ source: "/blog/how-miso-answers", destination: "/projects/miso-chat", permanent: true }` to `redirects()` in `next.config.ts`.
- [ ] 5.2 After a build, confirm that `/blog/how-miso-answers` returns a permanent redirect to `/projects/miso-chat`, and that `/blog`, `rss.xml` and `sitemap.xml` no longer list the post while the sitemap lists `/projects/miso-chat`.

## 6. Agent and evals

- [ ] 6.1 Update the `SYSTEM` rule in `lib/agent.ts` for questions about how this chat works: search unscoped or scoped to `miso-chat`, never to another project. Update the `project` parameter description to match. Remove the sentence "this chat (Miso) is not one of the projects".
- [ ] 6.2 In `scripts/eval-chat.ts`, set `POST` to `/projects/miso-chat` and rename it `MISO_PAGE`. Change the Pinecone regression check to fail only when a search is scoped to a project other than `miso-chat`.
- [ ] 6.3 Update the `POST_FIGURES` set only if task 2.6 changed any duration figure (it shouldn't, since only chunk and token counts change).
- [ ] 6.4 Add an offline check: chunk ids are still unique with the new project, and the `miso` profile chunk and the `miso-chat` summary chunk both exist.
- [ ] 6.5 Run `npm run eval:chat` with the keys set and confirm that every check passes, including the existing retrieval golden set (no other project displaced). Record the output in `evidence/eval.txt`.

## 7. Build and verify

- [ ] 7.1 Run `npm run build`. It must pass: schema, tags and widget-marker validation, the vector sync into the new namespace, and the precomputed bubble answers.
- [ ] 7.2 Read the regenerated `lib/generated/answers.json` and confirm that no bubble answer links to `/blog/how-miso-answers` or shows raw citation markers.
- [ ] 7.3 Check the home grid. On "All", the card is third after InvoiceChaser in the two-column layout. On the AI engineering tab, five cards show in the featured layout. Check both at phone width.
- [ ] 7.4 Review `git diff` and commit in focused commits: content, cover, chat link, redirect, agent and evals.

## 8. Deploy preview checks

- [ ] 8.1 On the Netlify deploy preview:
  - follow the redirect
  - view the case study (figures, widgets, reduced motion)
  - view the cover
  - use the chat link
  - ask "How does Miso cache answers?" and "What happens to Miso if Pinecone goes down?" and confirm both cite `/projects/miso-chat` with no other project scoped
  - ask "Who are you?" and confirm no search runs

## Workflow follow-up

- Before deploying: `git merge main` into the branch and re-run `npm run eval:chat` and `npm run build`, then merge the branch into `main` and publish. Remove the worktree afterwards with `git worktree remove ../chiranjeevthomas.com-miso`. Archive this change with `/opsx:archive`.
- Optionally link the README's Miso overview to `https://www.chiranjeevthomas.com/projects/miso-chat`.
