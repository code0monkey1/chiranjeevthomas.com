---
title: Making a free-tier RAG agent fast without serving stale answers
description: How Miso, the agent on this site, answers in about two seconds on a free LLM tier, why I cache its answers per deploy instead of by content hash, and the vector-index bug that caching exposed.
date: 2026-11-22
tags: [ai-engineering, agents, rag, llm, observability]
draft: false
---

Miso is the chat on this site: a tool-calling RAG agent that answers questions about my work and cites where each answer came from. This post is about the unglamorous part of running it: what each answer costs, how I cached answers without ever serving a stale one, and a deploy bug that caching made impossible to ignore.

- **Suggestion bubbles now answer in under 0.1 s instead of about 2 s.** Their answers are computed when the site is built and shipped in the page, so a click makes no request.
- **A repeated first question costs no LLM call.** It comes from a cache that belongs to the deploy, so it can never outlive the content and code that produced it.
- **The chat's vectors now belong to the deploy too.** A build in progress, a failed build or a rollback no longer leaves Miso searching content the pages don't show.

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

## Why caching an agent's answers is harder than caching an API

A cache for Miso can't key on the question alone. Three things make it harder than caching an API response:

- **Answers depend on the conversation.** "What stack did it use?" means something different after each project. So Miso only caches first questions, asked with no history. The suggestion bubbles are the exception: they stand on their own, so their answer is the same whatever came before.
- **A bad answer would be frozen.** A model on a busy minute falls back to a smaller model, and a search can come back thin. A cache would replay those for everyone. So only answers that are live, grounded, cited, from the main model and found with a working meaning search are stored.
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

## What Miso's cache does now

Pick a kind of question to see which layers it touches and what it costs:

<!-- widget:cache-paths -->

Two details matter in production. The cache write runs after the response has finished, so saving an answer never delays it. And every cache read and write has a short timeout: if the store is slow or down, Miso answers live as before.

That timeout exists because of a real failure. On my first deploy preview, typed first questions hung for 30 seconds and returned 504s, while follow-ups (which skip the cache) worked. I switched the store to the same fetch and region settings Netlify's own Next.js adapter uses for its Blobs, and added the timeouts so a hanging cache can only ever cost 1.5 seconds. On production, a cache hit is found in about 60 ms (median of five).

Caching also froze a bug that had always been there. The first production build precomputed a bubble answer that showed raw citation markers like `[job‑grabbit]`: the model had written the ids with non-breaking hyphens, which the citation parser didn't recognise. Before caching, that answer would have been one visitor's bad luck. Precomputed, every visitor saw it. The parser now normalises Unicode hyphens, and an answer that still shows citation markers is never cached.

<figure class="diagram"><img src="/media/miso-cache-hit-trace.jpg" alt="Miso's chat on production answering a repeated question from the cache: the agent trace shows 'Cache hit · runtime · 72ms', the original run below it, and 'done in 0.4s'." loading="lazy"><figcaption>A repeated question on production: found in the cache in 72 ms, answered in 0.4 s.</figcaption></figure>

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

Per-version namespaces cost something I chose to pay: a content change now embeds Miso's whole corpus: 57 chunks and about 9K tokens with this post included (43 chunks, about 6K tokens, before it) instead of only the changed chunks. Copying unchanged vectors forward would avoid that, but Pinecone's current API doesn't return the vectors it derives from text. A design with one immutable record per chunk version plus a per-deploy manifest would avoid it too, at the cost of tracking which records each kept deploy still references. At this size, the simple version wins. I'd switch if a full embed ever cost more than 10% of the monthly embedding allowance or added more than 10 seconds to a build.

## Pruning old vector namespaces, and a trap I nearly shipped

Old namespaces have to go: Pinecone's free plan allows 100 per index. Miso keeps the live namespace plus the 4 most recently published, so rolling back a few versions still gets full search.

My first pruning rule stamped each namespace with "last used" when a build synced it, then kept the most recent. Meadows calls this trap "seeking the wrong goal": the goal was "keep what visitors were served", but the rule measured "what was built". A failed build would stamp its namespace, and the rule would keep that orphan while deleting one that real visitors had used.

So each namespace carries two stamps. `syncedAt` only protects a namespace a build may still be using. `publishedAt` is written after Netlify has published the deploy, by a build plugin that runs in Netlify's `onSuccess` step, and only that stamp decides what's kept. A failed build never reaches `onSuccess`, so it never prunes anything. A rollback further back than the kept versions still works: its chat falls back to keyword search over that deploy's own content, and those answers are never cached.

## When things break

| Situation | What Miso does |
|---|---|
| Groq rate limit | Retries on the smaller model. Those answers are shown but never cached. |
| Groq down, or no key | Retrieval only: quotes the best passages from the same hybrid search. |
| Pinecone down | Keyword search answers alone. Not cached, because meaning search didn't run. |
| Answer cache slow or down | Gives up after 1.5 s and answers live. A failed write is logged and ignored. |
| The build can't precompute a bubble | That bubble answers live. The build never fails over it. |
| A build fails | Nothing live changes and nothing is pruned. |
| Rollback within the last 5 versions | Its own pages, cached answers and vectors come back together. |
| Rollback further back | Keyword search over its own content. Not cached. |
| The model cites a chunk it never retrieved | The citation is dropped before the answer is shown. |
| The model formats citations oddly (Unicode hyphens) | Normalised before parsing. An answer still showing markers is never cached. |

## What it cost and what it bought

Here is what Miso's caching changed, measured before and after:

| | Before | After |
|---|---|---|
| Suggestion bubble | 1.6 to 1.8 s to first words, about 2.0 s total, 2 LLM calls | under 0.1 s, no request |
| Repeated first question | about 2.0 s, 2 LLM calls, counts against the visitor's daily limit | found in about 60 ms, no LLM call, doesn't count. End to end 0.4 s in a warm browser session, up to about 5 s when a fresh function instance starts |
| New first question | about 2.0 s | about 2.0 s, plus a cache lookup of 15 to 100 ms |
| Build and deploy time | 65 s | 88 s: the 23 s buys precomputed bubbles |
| Deploy with unchanged content | vectors re-checked in place | same namespace, 0 chunks embedded |
| Deploy with changed content | only changed chunks embedded, into the live namespace | the whole corpus (about 9K tokens now) into a new namespace, live untouched until publish |

All figures are as of November 2026, measured on this site's production deploys before and after the change.

## What I'd do at 1,000x the traffic

None of this is shipped. It's where I'd take Miso if it had to serve a lot more people:

- **A semantic cache with a verifier.** Match near-duplicate questions by embedding, but have a cheap model confirm the cached answer actually answers the new question before serving it.
- **A shared cache with an explicit TTL,** such as Redis, keyed by deploy, so cache warmth doesn't depend on one store per deploy.
- **Content-addressed vector records:** one immutable record per chunk version and a per-deploy manifest used as a query filter, so a content change embeds only what changed.
- **Hit-rate and cost dashboards,** so a drop in hit rate after a deploy is visible before the bill is.
- **Eval-gated cache writes:** run a small golden set against an answer before it's allowed into the cache.

## Ask Miso about this post

Everything above is in Miso's search index too. Open the chat and ask "How does Miso cache answers?" or "What happens if Pinecone goes down?". Miso will answer from this post, cite it, and show you the trace, including whether the answer came from the cache.
