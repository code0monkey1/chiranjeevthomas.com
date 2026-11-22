---
title: Miso — the agent on this site
headline: A free-tier RAG agent that answers in two seconds, cites every claim and never serves a stale answer
summary: Miso is the chat on this site. It searches by meaning and by keyword, answers only from what it found, shows its work in a live trace, and caches answers per deploy so a repeated question costs no LLM call.
description: How I built Miso, the tool-calling RAG agent on this site. It covers hybrid search with rank fusion, grounded citations, chunking, a per-deploy answer cache, per-version vector namespaces, evals, the failure modes, and the decisions I measured along the way.
status: Live
date: 2026-10-21
order: 3
types: [ai-engineering]
tags: [agents, rag, llm, observability]
stack: [Next.js 15, Groq · gpt-oss-120b, Pinecone integrated inference, BM25, Netlify Blobs, Netlify]
links:
  demo: https://www.chiranjeevthomas.com/#ask-miso
  github: https://github.com/code0monkey1/chiranjeevthomas.com
---

Miso is the chat on this site: a tool-calling RAG agent that answers questions about my work and cites where each answer came from. This page covers how I built it, and the unglamorous part of running it: what each answer costs, how I cached answers without ever serving a stale one, and a deploy bug that caching made impossible to ignore.

- **Suggestion bubbles answer in under 0.1 s instead of about 2 s.** Their answers are computed when the site is built and shipped in the page, so a click makes no request.
- **A repeated first question costs no LLM call.** It comes from a cache that belongs to the deploy, so it can never outlive the content and code that produced it.
- **The chat's vectors belong to the deploy too.** A build in progress, a failed build or a rollback no longer leaves Miso searching content the pages don't show.

## What Miso is

- **Agentic retrieval:** the LLM decides *whether* to search, *what* to search for (it rewrites vague or follow-up questions into standalone queries), and *where*: it can scope a search to a single project. Up to 3 searches per question.
- **Hybrid search:** every search runs a meaning search (Pinecone vector embeddings) and a keyword search (BM25), merged with reciprocal rank fusion.
- **Grounded answers:** the model may cite only chunk ids it actually retrieved. Fabricated citations are dropped before the answer reaches the visitor.
- **Always matches the page:** each version of the content gets its own Pinecone namespace, so a build in progress, a failed build or a rollback never leaves the chat searching content the site doesn't show.
- **Degrades instead of breaking:** with no Pinecone it searches by keyword; with no LLM (or a Groq outage) it quotes the best passages; on a Groq rate limit it switches models.
- **Observable:** the agent trace beside the chat shows each tool call, the meaning and keyword matches with their scores, the merged ranking, and which sources the answer used.

It's built with Next.js 15 on Netlify, Groq's `gpt-oss-120b` for the agent, Pinecone integrated inference (`llama-text-embed-v2`) for meaning search and a local BM25 index for keywords.

## The constraint: two LLM calls a click on a free tier

Miso runs on Groq's `gpt-oss-120b`. Groq's published limits for it are 8K tokens a minute and 1,000 requests a day. Every live answer takes two LLM calls (one to decide what to search, one to write the answer) plus a Pinecone search, so the request cap alone means about 500 answers a day across all visitors.

Before caching, I measured the four suggestion bubbles on production, five runs each: the first words arrived after 1.6 to 1.8 seconds and the answer finished after about 2.0 seconds. The first request of a session took 6.5 seconds, a cold start.

Most visitors click a suggestion bubble rather than typing. So the most common thing Miso did was recompute the same four answers, each time spending two of the day's requests and a few thousand of the minute's tokens.

## How Miso answers a question

Every question goes through the same agent loop. The model decides whether to search and rewrites vague follow-ups into a standalone query. Each search runs a meaning search (Pinecone embeddings) and a keyword search (BM25) and merges them with reciprocal rank fusion. The model then answers only from the chunks that came back, and any citation it invents is dropped before the answer reaches you.

<!-- widget:miso-question-flow -->

<figure class="diagram">
<picture>
<source media="(prefers-reduced-motion: reduce)" srcset="/media/miso-pipeline-static.svg">
<img src="/media/miso-pipeline.svg" alt="Miso's pipeline: content is chunked and synced to Pinecone at build time; each question runs meaning and keyword search, the rankings are fused, and the Groq agent answers only from the results." loading="lazy">
</picture>
<figcaption>Build time prepares the vectors; request time searches them by meaning and by keyword. <a href="/media/miso-pipeline.svg">Open full size</a></figcaption>
</figure>

Keyword search alone gets paraphrases wrong, which is why Miso runs both searches every time:

<figure class="diagram">
<picture>
<source media="(prefers-reduced-motion: reduce)" srcset="/media/meaning-vs-keywords-static.svg">
<img src="/media/meaning-vs-keywords.svg" alt="For a paraphrased question, keyword search ranks Contact and Profile first because they share the word 'based'; meaning search finds the RAG write-up, and an off-topic question returns nothing." loading="lazy">
</picture>
<figcaption>Real results from this site's index. <a href="/media/meaning-vs-keywords.svg">Open full size</a></figcaption>
</figure>

<figure class="diagram">
<picture>
<source media="(prefers-reduced-motion: reduce)" srcset="/media/rank-fusion-static.svg">
<img src="/media/rank-fusion.svg" alt="Reciprocal rank fusion: the Pinecone and BM25 rankings merge, chunks both searches agree on take the top four, and keyword-only noise is dropped." loading="lazy">
</picture>
<figcaption>Rank fusion uses positions, not scores, because cosine similarity and BM25 live on different scales. <a href="/media/rank-fusion.svg">Open full size</a></figcaption>
</figure>

Each search returns its top 10. Every chunk then scores `Σ 1 / (60 + rank)` over the lists it appears in, and the top 4 go to the LLM. Chunks both searches agree on rise; noise from a single list sinks.

## Follow-up questions without server sessions

The server keeps no session state. Each request carries the last 8 messages (4 exchanges), and assistant turns include the titles of their sources. The system prompt tells the model to use that history to resolve follow-ups ("what stack did *it* use?" means InvoiceChaser after a question about InvoiceChaser), to rewrite them into standalone search queries, and to treat earlier answers as context, not as a source: every factual follow-up is searched again and cited. The history resets on reload or "new chat".

## Chunking: one idea per chunk, never across projects

Miso's search index is built from the same content files as the pages, so the chat learns about a new project on the next deploy.

| Source | Chunks |
|---|---|
| Each project | A summary chunk (title, status, type, summary, stack, links) plus one chunk per `##` section of the case study |
| Each blog post | One chunk per `##` section, titled "Post title: Section" |
| Each job | One chunk per role |
| Each skill group | One chunk with every skill and where it was used |
| All projects | One overview chunk: every project with its type, status and one-line summary, so list questions ("which full-stack projects?") see them all at once |
| Profile, contact, Miso the cat | One chunk each |

**Why split on headings instead of fixed-size windows?** Fixed windows with overlap (for example LangChain's 500-character splitter) suit PDFs, where nothing marks where an idea ends. These files are written with `##` sections, and each section is already one idea. Splitting there never cuts an idea in half, so overlap would only duplicate text and blur which section matched. Each chunk is embedded as `Title. Text`, so a section called "The plan" still carries its project's name.

**Every chunk belongs to exactly one file.** Each chunk records its source and, when it is about a project, that project's slug. Both are stored in Pinecone as metadata, which lets the agent run a search limited to one project, and the evals check that a project-scoped search never leaks into another project.

When I first built the index (40 chunks, about 3,400 tokens), I measured the strategy against the alternatives on 9 recruiter-style questions on live Pinecone, including two "list all" questions:

| Strategy | Right page in results | Coverage of list answers | Tokens sent to the LLM |
|---|---|---|---|
| **Sections + overview chunk (live)** | 8/9 | 0.89 | ~410 |
| Sections only | 8/9 | 0.82 | ~380 |
| One chunk per document | 8/9 | 0.76 | ~710 |
| Small-to-big (match sections, return whole projects) | 8/9 | 0.80 | ~1,150 |

Whole documents dilute each embedding and cost almost twice the tokens. Small-to-big costs three times as many for no gain. Returning 6 chunks instead of 4 added nothing once the overview chunk existed. The whole corpus would fit in one prompt, but Groq's free tier allows 8K tokens a minute, so sending ~400 retrieved tokens instead of ~3,400 is what lets several visitors chat at once.

## Semantic search, and when to say "not covered"

The Pinecone index uses integrated inference: the app sends text, and Pinecone embeds it with its hosted `llama-text-embed-v2` model, both when chunks are upserted and when a question is searched. No embedding model runs in the app, so the Netlify function only needs Pinecone's JavaScript client, with no model files or native binaries.

Matches below **0.15** are dropped. Real matches on this index score about 0.2 to 0.35, while an off-topic question about his food preferences tops out at 0.12, so the chat says the topic isn't covered instead of quoting something unrelated. The floor doesn't apply to project-scoped searches.

Keyword search still matters: exact names ("InvoiceChaser") and questions about his current role, which BM25 maps onto the wording of the experience section, are where it is strongest. So every search runs both.

## Decisions I measured

- **Local embeddings → Pinecone integrated inference.** I first ran `bge-small-en-v1.5` locally with transformers.js. It worked, but it needed a native ONNX runtime plus 34 MB of model files inside the Netlify function, and it ranked the hard paraphrases below the cut. Pinecone's hosted model is stronger, adds nothing to the bundle, and is free at this scale.
- **No reranker.** Pinecone's hosted `bge-reranker-v2-m3` scored nearly every candidate close to zero and moved a question about his current role to the contact chunk. It made results worse, and the free tier allows only 500 reranks a month.
- **Fusion weights don't matter here.** Weighting meaning 1.5 to 3 times over keywords changed none of the test outcomes, so plain reciprocal rank fusion stays.
- **Let the agent rewrite queries.** For a vaguely worded question about watching what an AI agent does, meaning search alone ranks the observability project 4th. The agent rewrites it into a query that names observability, scopes the search to that project, and answers from it.
- **Groq model.** Groq's free Developer plan no longer serves Llama 3.3 70B, so the agent uses `gpt-oss-120b`, which supports tool calling, with reasoning effort set to low.

## What you see while Miso works

The chat opens from a one-line "Ask Miso" bar in a modal dialog, so it never pushes the projects down the page, and it stays mounted while closed, so reopening keeps the conversation. While an answer is being written, the chat card glows, Miso chases a mouse across the pending bubble with a live status line and timer, and the agent trace fills in step by step: each search, its meaning and keyword matches with their scores, the merged ranking, and the time to first words. Sources under each answer link to the page they came from.

## Why caching an agent's answers is harder than caching an API

A cache for Miso can't key on the question alone. Three things make it harder than caching an API response:

- **Answers depend on the conversation.** "What stack did it use?" means something different after each project. So Miso only caches first questions, asked with no history. The suggestion bubbles are the exception: they stand on their own, so their answer is the same whatever came before.
- **A bad answer would be frozen.** A model on a busy minute falls back to a smaller model, and a search can come back thin. A cache would replay those for everyone. So only answers that are live, grounded, cited and found with a working meaning search are stored, and each entry records which model wrote it. Fallback-model answers are stored too, then upgraded (see below).
- **The trace has to stay honest.** Miso shows its work in an agent trace. A cached answer must not pretend to be fresh, so the trace says "Cache hit", which cache, and how long the lookup took, before replaying the original run's steps labelled as that run.

## Five ways Miso could cache answers

| Option | Where it lives | Why I took it or left it |
|---|---|---|
| In-memory map in the function | one server instance | Serverless instances recycle often, so hits would be rare. Left it. |
| Netlify Blobs store | shared by every instance | Survives cold starts and is shared. **Took it**, for typed first questions. |
| Precompute at build time | in the page itself | The bubbles are known in advance, so their answers can ship with the page. **Took it.** |
| CDN cache on a GET endpoint | Netlify's edge | Doesn't fit a streamed POST, and the two options above already cover it. Left it. |
| Semantic cache (match similar questions) | the vector index | Highest hit rate, but "resume" the document and "resume" a paused agent run look alike to an embedding. A confident wrong answer is the worst outcome for a portfolio. Left it. |

Precomputing the bubbles handles most of the traffic on its own. The Blobs store catches people who type the same first question.

## How Miso's cache works in production

Pick a kind of question to see which layers it touches and what it costs:

<!-- widget:cache-paths -->

Two details matter in production. The cache write runs after the response has finished, so saving an answer never delays it. And every cache read and write has a short timeout: if the store is slow or down, Miso answers live as before.

That timeout exists because of a real failure. On my first deploy preview, typed first questions hung for 30 seconds and returned 504s, while follow-ups (which skip the cache) worked. I switched the store to the same fetch and region settings Netlify's own Next.js adapter uses for its Blobs, and added the timeouts so a hanging cache can only ever cost 1.5 seconds. On production, a cache hit is found in about 60 ms (median of five).

Caching also froze a bug that had always been there. The first production build precomputed a bubble answer that showed raw citation markers like `[job‑grabbit]`: the model had written the ids with non-breaking hyphens, which the citation parser didn't recognise. Before caching, that answer would have been one visitor's bad luck. Precomputed, every visitor saw it. The parser now normalises Unicode hyphens, and an answer that still shows citation markers is never cached.

<figure class="diagram"><img src="/media/miso-cache-hit-trace.jpg" alt="Miso's chat on production answering a repeated question from the cache: the agent trace shows 'Cache hit · runtime · 72ms', the original run below it, and 'done in 0.4s'." loading="lazy"><figcaption>A repeated question on production: found in the cache in 72 ms, answered in 0.4 s.</figcaption></figure>

## Fallback answers: cache now, upgrade later

At first, Miso cached only answers from the main model. On Groq's free tier that turned out to be too strict: a busy minute sends a run to the smaller fallback model, so the same first question kept missing the cache exactly when the main model was busiest, which is when a cache matters most.

Now a grounded, cited fallback-model answer is cached too. A hit on one is served at once, and if it is older than 60 seconds, one silent run on the main model replaces it when that run is itself cacheable. A failed attempt keeps the entry and waits 10 minutes before trying again. A main-model entry is never replaced by a fallback answer. Upgrade runs have their own budget of 50 a day per function instance, so free cache hits can never use up visitors' quota. The build does the same for the bubbles: it prefers the main model, retries once after 20 seconds, and keeps a grounded fallback answer rather than dropping the bubble to live. Every skipped cache write logs one line with the reason, so a future "always misses" report can be diagnosed from the function logs.

## The cache key decision I reversed

My first design for Miso's answer cache keyed answers on a fingerprint: a hash of the content chunks, the prompt and agent code, and the model. A deploy that changed none of those would keep the cache warm. It sounded efficient, and over the previous month, 5 of the 12 commits to this site touched nothing an answer depends on.

I switched to scoping the cache to the deploy. Every deploy starts with an empty store, and Netlify deletes the store together with the deploy. The reason: everything an answer depends on changes only when I deploy. Content is synced at build time, and even an environment change to the model takes effect only on a new deploy. A fingerprint is only correct if I remember to hash every input. Miss one, and Miso silently serves stale answers. A deploy-scoped store can't be wrong, it isolates previews from production for free, and a rollback brings back that deploy's own answers.

What I gave up: after a styling-only deploy, the first person to ask each typed question pays for one live answer. With the bubbles precomputed on every build anyway, that's cheap.

## Miso's vectors had the same bug

Designing the answer cache around the deploy exposed an older problem. Every build synced the chat's vectors into one shared Pinecone namespace before compiling the site. So during the roughly one-minute build, the live site's chat searched content its pages didn't show yet. If the build then failed, it stayed that way. And a rollback restored the old pages but kept the newest vectors.

In the terms of Donella Meadows' *Thinking in Systems: A Primer* (2008), the pages and the cached answers sat inside the deploy's boundary and moved together, but the vectors were a stock outside it, changed by every build whether or not that build ever went live.

<!-- widget:deploy-timeline -->

The fix moves the vectors inside the boundary. Each build syncs into a namespace named after a hash of its content, such as `production-42f3b881`, and bakes that name into the server code. Unchanged content gets the same name, so the sync embeds nothing. Changed content fills a new namespace while the live site keeps searching the old one, and Netlify's publish switches pages, answers and vectors in one step.

<figure class="diagram">
<picture>
<source media="(prefers-reduced-motion: reduce)" srcset="/media/vector-sync-static.svg">
<img src="/media/vector-sync.svg" alt="Each version of the content gets its own Pinecone namespace: a build with edited content fills a new namespace while the live deploy keeps searching its own, publishing switches everything together, pruning after publish keeps the live namespace and the 4 most recently published, and a CSS-only build reuses the namespace." loading="lazy">
</picture>
<figcaption><a href="/media/vector-sync.svg">Open full size</a></figcaption>
</figure>

## The tradeoff: Miso re-embeds everything when content changes

Per-version namespaces cost something I chose to pay: a content change now embeds Miso's whole corpus: 66 chunks and about 12K tokens with this case study included (43 chunks, about 6K tokens, before the Miso write-up existed) instead of only the changed chunks. Copying unchanged vectors forward would avoid that, but Pinecone's current API doesn't return the vectors it derives from text. A design with one immutable record per chunk version plus a per-deploy manifest would avoid it too, at the cost of tracking which records each kept deploy still references. At this size, the simple version wins. I'd switch if a full embed ever cost more than 10% of the monthly embedding allowance or added more than 10 seconds to a build.

## Pruning old vector namespaces, and a trap I nearly shipped

Old namespaces have to go: Pinecone's free plan allows 100 per index. Miso keeps the live namespace plus the 4 most recently published, so rolling back a few versions still gets full search.

My first pruning rule stamped each namespace with "last used" when a build synced it, then kept the most recent. Meadows calls this trap "seeking the wrong goal": the goal was "keep what visitors were served", but the rule measured "what was built". A failed build would stamp its namespace, and the rule would keep that orphan while deleting one that real visitors had used.

So each namespace carries two stamps. `syncedAt` only protects a namespace a build may still be using. `publishedAt` is written after Netlify has published the deploy, by a build plugin that runs in Netlify's `onSuccess` step, and only that stamp decides what's kept. A failed build never reaches `onSuccess`, so it never prunes anything. A rollback further back than the kept versions still works: its chat falls back to keyword search over that deploy's own content, and those answers are never cached.

## When things break

| Situation | What Miso does |
|---|---|
| Groq rate limit | Retries on the smaller model (`gpt-oss-20b`), then waits the seconds Groq asks for and retries once. A grounded, cited fallback answer is cached and later replaced in the background by a main-model one. |
| Groq down, or no key | Retrieval only: quotes the best passages from the same hybrid search. |
| Pinecone down | Keyword search answers alone. Not cached, because meaning search didn't run. |
| Answer cache slow or down | Gives up after 1.5 s and answers live. A failed write is logged and ignored. |
| The build can't precompute a bubble | That bubble answers live. The build never fails over it. |
| A build fails | Nothing live changes and nothing is pruned. |
| Rollback within the last 5 versions | Its own pages, cached answers and vectors come back together. |
| Rollback further back | Keyword search over its own content. Not cached. |
| The model cites a chunk it never retrieved | The citation is dropped before the answer is shown. |
| The model formats citations oddly (Unicode hyphens) | Normalised before parsing. An answer still showing markers is never cached. |
| Off-topic request ("write a letter", "2 + 2") | A short, in-character redirect to questions about my work, never a bare refusal. |
| Prompt injection in a question or in content | The system prompt treats both as data, not instructions. |
| Abuse | 30 questions per visitor IP a day and 500 overall by default, using only the IP header Netlify sets, never the client-controlled `X-Forwarded-For`. Counters live in memory per function instance, so this is best effort. A cache hit doesn't count. |

## How I test it: evals on every change

`npm run eval:chat` runs offline checks on every change, plus live checks when the API keys are present:

- **Retrieval:** each recruiter question must reach the expected page.
- **Chunk boundaries:** unique ids, one source per chunk, and a project-scoped search never leaks into another project.
- **Vector sync** (against an in-memory fake Pinecone): the first sync uploads everything, a re-sync sends nothing, and one edit plus one deletion sends exactly one upsert and one delete.
- **Fusion:** a chunk found only by meaning still makes the top 4, and a Pinecone error falls back to keywords.
- **Agent loop** (mocked model): tool calls are traced, fabricated citations are dropped, Markdown is flattened, and a 429 switches to the fallback model.
- **Live, with keys:** paraphrases that keyword search misses must be found by meaning, the project filter must hold, off-topic questions retrieve nothing, answers must be grounded, a follow-up's "it" must resolve to the earlier project, an uncovered personal fact is declined instead of invented, and questions about how Miso works are searched and cited from this page.

## What it cost and what it bought

Here is what Miso's caching changed, measured before and after:

| | Before | After |
|---|---|---|
| Suggestion bubble | 1.6 to 1.8 s to first words, about 2.0 s total, 2 LLM calls | under 0.1 s, no request |
| Repeated first question | about 2.0 s, 2 LLM calls, counts against the visitor's daily limit | found in about 60 ms, no LLM call, doesn't count. End to end 0.4 s in a warm browser session, up to about 5 s when a fresh function instance starts |
| New first question | about 2.0 s | about 2.0 s, plus a cache lookup of 15 to 100 ms |
| Build and deploy time | 65 s | 88 s: the 23 s buys precomputed bubbles |
| Deploy with unchanged content | vectors re-checked in place | same namespace, 0 chunks embedded |
| Deploy with changed content | only changed chunks embedded, into the live namespace | the whole corpus (about 12K tokens now) into a new namespace, live untouched until publish |

All figures are as of November 2026, measured on this site's production deploys before and after the change.

## What I'd do at 1,000x the traffic

None of this is shipped. It's where I'd take Miso if it had to serve a lot more people:

- **A semantic cache with a verifier.** Match near-duplicate questions by embedding, but have a cheap model confirm the cached answer actually answers the new question before serving it.
- **A shared cache with an explicit TTL,** such as Redis, keyed by deploy, so cache warmth doesn't depend on one store per deploy.
- **Content-addressed vector records:** one immutable record per chunk version and a per-deploy manifest used as a query filter, so a content change embeds only what changed.
- **Hit-rate and cost dashboards,** so a drop in hit rate after a deploy is visible before the bill is.
- **Eval-gated cache writes:** run a small golden set against an answer before it's allowed into the cache.

## Ask Miso about this project

Everything above is in Miso's search index too. Open the chat and ask "How does Miso cache answers?" or "What happens if Pinecone goes down?". Miso will answer from this page, cite it, and show you the trace, including whether the answer came from the cache.
