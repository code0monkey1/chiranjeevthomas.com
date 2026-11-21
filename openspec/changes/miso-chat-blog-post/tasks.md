# Tasks

## 1. Baseline measurements (do first, before `cache-miso-answers` reaches production)

- [x] 1.1 Create `measurements.md` in this change and record the pre-cache baseline on production: for each of the 4 suggestions, first-words and total time from the trace header (median of 5 runs), Groq rounds and searches from the trace; verify every row names its source (screenshot path or trace text) and the deploy ID it was measured on
- [ ] 1.2 Record the fixed facts with sources: Groq free-tier tokens/min (provider docs URL), Pinecone Starter namespace cap (docs URL), corpus chunk count and approximate tokens (`buildIndex()` output), recent `deploy_time` (Netlify deploy record); verify each has a URL, command or code line

## 2. Widgets in posts

- [ ] 2.1 Move widget names to `components/widgets/names.ts` (`WIDGET_NAMES`), use it in the `Widget` registry, and make content loading throw on an unknown `<!-- widget:… -->` name in any post or project; add an eval/unit check that a fake body with `widget:nope` throws with the file and name, and verify `npm run build` still passes for current content
- [ ] 2.2 Render widgets in `app/blog/[slug]/page.tsx` with `splitWidgets` exactly like case studies; verify with a temporary draft post containing `<!-- widget:rag-pipeline -->` that the widget appears at the marker (then remove the temporary post)

## 2b. Miso searches questions about how it works

- [ ] 2.3 Split the "Questions about you (Miso)" rule in `SYSTEM` (`lib/agent.ts`) per design.md §5a; add mocked-model eval cases checking the prompt contains both rules, and live eval cases: "Who are you?" and "Are you a real cat?" make no `search_portfolio` call, while "How does this chat find its answers?" makes at least one; verify `npm run eval:chat` (offline and with keys) passes

## 3. Animated diagrams

- [ ] 3.1 Copy `miso-pipeline`, `meaning-vs-keywords` and `rank-fusion` SVGs to `public/media/`; write a small script that generates `*-static.svg` final-frame variants (strip SMIL elements, apply each animation's final value); verify each static file renders every label (open in a browser) and has no `<animate` left (`grep -c`)
- [ ] 3.2 Redraw `vector-sync.svg` (plus its static variant) to show content-addressed namespaces: unchanged content reuses the namespace, changed content fills a new one, live keeps reading the old one until publish; verify its alt text describes that, and update the README image to the redrawn version
- [ ] 3.3 Check all four diagrams in light and dark theme and at 360 px width; verify text stays legible (fix fills if not) and record screenshots in the change

## 4. Miso widgets

- [ ] 4.1 Create `components/widgets/miso-figures.ts` holding every figure the widgets display, filled from `measurements.md` with an "as of" date; verify no widget file contains a numeric literal for a measured figure (`grep`)
- [ ] 4.2 Build `miso-question-flow` (8 steps from click to sources, each with what/where-in-code/time), server-rendered default step, `aria-live` detail, Play/Pause; verify keyboard-only stepping, screen-reader announcement (VoiceOver), reduced-motion static rendering, and no horizontal scroll at 360 px
- [ ] 4.3 Build `cache-paths` (layers: bundle, `/api/chat`, deploy store, rate limiter, Groq, Pinecone; chips for the 4 paths) with lit/dimmed layers and the latency / LLM calls / Pinecone queries / quota readout; verify the same accessibility and layout checks as 4.2, and that each path's readout matches `miso-figures.ts`
- [ ] 4.4 Build `deploy-timeline` (D1, D2, D3 build window, D3 published, rollback to D2) with a Before/After toggle showing what is served at each step and marking mismatches; verify the same checks as 4.2, and that "Before" marks the build-window and rollback mismatches while "After" marks none within retention
- [ ] 4.5 Register the three widgets and their names; verify a draft post using all three builds and renders them

## 5. Post-launch measurements (after `cache-miso-answers` and `pin-vectors-to-deploy` are live)

- [ ] 5.1 Measure and log: bubble click time (client timer), runtime cache hit and miss lookup times (trace steps, median of 5), Groq rounds per path (0 for hits), tokens for a typical first-time question (Groq `usage` from a scratch run), precompute duration and namespace name/upserts (build log), embedding tokens per content deploy, current namespace count (Pinecone console); verify each new row in `measurements.md` has a source and the deploy ID, and copy the values into `miso-figures.ts`
- [ ] 5.2 Capture a trace screenshot showing `Cache hit · runtime · Nms` and save it to `public/media/`; verify it contains no visitor data

## 6. The post

- [ ] 6.1 Write `content/posts/how-miso-answers.md` (`draft: true`) following the outline in design.md §6, with each `##` section self-contained (names Miso and its subject, ≤ ~250 words), GitHub permalinks for code, the Meadows citation, and `<picture>` embeds; verify every number in the text appears in `measurements.md` (manual cross-check listed in the PR) and the TL;DR has 3 bullets with measured figures
- [ ] 6.2 Proofread for over-claiming: the "1,000x" section is labelled as a design not shipped, the reversed decision is stated plainly, and no figure lacks a source; verify with a second read of each section against design.md
- [ ] 6.3 Check the rendered post: table of contents, reading time, tags, RSS entry, sitemap entry and Open Graph metadata; verify on `npm run dev` and in `/rss.xml` and `/sitemap.xml`

## 7. Miso self-knowledge

- [ ] 7.1 Add live eval cases: "How does Miso cache answers?", "What happens to the chat if Pinecone goes down?" and "How fast is a cached answer?" must be grounded and cite `/blog/how-miso-answers` (the last must state only the post's figure); verify with `npm run eval:chat` with keys
- [ ] 7.2 Run the existing retrieval golden set with the post included; verify every case still reaches its expected page, rewriting any post section that displaces a project rather than widening accepted pages

## 8. Launch

- [ ] 8.1 Set `draft: false`, deploy, and verify on production: the post renders with all widgets and diagrams, the sync log shows the post's chunks upserted, and asking Miso "How does Miso cache answers?" in the live chat cites the post

## Workflow follow-up

- Revisit the design's open questions (a suggestion bubble about caching, a Miso case study) once the post has been live for a week.
- Archive after `cache-miso-answers` and `pin-vectors-to-deploy`.
