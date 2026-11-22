# Design

## Context

- `resolveNamespace()` (`lib/namespace.ts`) maps the Netlify `CONTEXT` to `production` / `preview` / `local`. `next.config.ts` bakes the result into the server bundle as `PINECONE_NAMESPACE`, so the runtime never recomputes it.
- `syncRecords()` (`lib/vector-store.ts`) is already a delta sync. It lists the IDs, reads each stored `hash`, upserts the chunks that changed and deletes the ones that were removed. `hashOf()` covers each chunk's text, href, source, project and `EMBED_MODEL`.
- **The current corpus:**
  - 43 chunks, about 6K tokens, so a full embed is about 6K tokens.
  - 6 of the 12 non-merge commits from 21 Oct to 21 Nov 2026 touched `content/` (corrected: an earlier count of "3 of 8" mixed in merge commits).
  - The live deploy builds in about 65 s.
- **Where deploys come from:** every Netlify deploy is `context: production` from `main`. No deploy previews exist today, but Netlify enables them by default.
- **Netlify facts, verified:**
  - `onSuccess` build-plugin events run after the deploy is live.
  - "Publish deploy" (rollback) does not rebuild.
- **Pinecone facts:**
  - The Starter plan allows 100 namespaces per index.
  - SDK 8.2.0 has `listNamespaces()` and `deleteNamespace()`. Namespaces carry no creation time.
- **Search falls back on its own:** `searchWithTrace` already falls back to BM25 over the deploy's bundled content when Pinecone errors, and it returns no dense hits for a missing namespace.

## Goals / Non-Goals

**Goals:**
- A deploy's chat only ever searches vectors of that deploy's content.
- Building, failing and rolling back never alter the live deploy's vectors.
- Pruning is safe by construction (it runs after publish) and needs no external state.
- Answers from a degraded search never enter a cache.

**Non-Goals:**
- Restoring vectors for a rollback beyond the retention window. The degraded mode was accepted.
- Embedding only the changed chunks into the new snapshot. This is a deliberate, scale-dependent tradeoff, not an oversight (see Decision 5).
- Sharing one namespace across environments.
- Changing local development's live, edit-in-place sync.

## Decisions

### 1. Namespace = environment + corpus hash

```
corpusHash = sha256( sort( chunks.map(hashOf) ).join("\n") ).slice(0, 8)

CONTEXT=production       -> "production-<corpusHash>"
CONTEXT=deploy-preview|* -> "preview-<corpusHash>"
no CONTEXT (next dev)    -> "local"                   (unchanged)
PINECONE_NAMESPACE set   -> that value                (unchanged override, used by evals)
```

- The hashes are sorted, so file read order can't change the name.
- `hashOf` already includes `EMBED_MODEL`, so changing the embedding model also gives a new namespace.
- 8 hex characters (32 bits) is plenty: fewer than 10 namespaces exist at any time.
- `corpusHash` sits next to `hashOf` in `lib/vector-store.ts`. `next.config.ts` therefore loads `buildIndex()` (`lib/search-index.ts`) and, through it, the Pinecone client module, once at config time. That's accepted: the client isn't used there, and decoupling `buildIndex` and `EMBED_MODEL` from `vector-store.ts` would be a refactor for no behaviour gain.
- **Alternatives considered:**
  - Deploy ID as the name: every deploy would embed, and Netlify doesn't expose the ID to `next.config` until the build is underway.
  - Timestamped names: reverting content would create a new namespace instead of reusing the old one, and the order of the names misleads pruning (see Decision 3).

### 2. Sync targets the hashed namespace with the existing delta algorithm

There's no new sync code. `syncRecords(chunks, getNamespace(resolveNamespace()))` now runs against the hashed namespace:
- **New namespace:** everything is upserted.
- **Existing complete namespace:** 0 upserts, after about 1 s of list and fetch.
- **Half-written namespace** (a killed build): only the missing chunks are upserted. That's the self-heal.

The ~5 s indexing wait after upserts (added by `cache-miso-answers` task 3.1) covers a freshly filled namespace before the precompute step searches it.

### 3. Pruning in `onSuccess`, ordered by a "last used" stamp

- **Why `onSuccess`:** at that moment the live deploy is this build's deploy, so its namespace is known and is never a prune candidate.
  - A failed build never reaches `onSuccess`, so its orphaned namespace survives until a later successful deploy prunes it.
  - Pruning during the build was rejected: a rolled-back deploy could still be live then, and its namespace could be deleted while it serves traffic.
- **Why a stamp:** namespaces carry no creation time, and content-addressed names can't be ordered by name. Reverting content reuses an old name, which would look oldest.
- **How the stamps work:** each namespace's `profile` record (it always exists) carries two metadata stamps, written with a metadata-only `update`. They answer different questions:
  - `syncedAt` is written at the end of every sync. It only protects a namespace that's in use by a build in progress.
  - `publishedAt` is written in `onSuccess` for the live namespace. It's the only stamp that retention ranks by.

  A single "last used" stamp written at sync time would rank a failed build's orphan above a namespace that was actually published, and prune the wrong one. That's the "Seeking the Wrong Goal" trap: the loop would measure "built recently" when the goal is "served recently".
- **Pruning rule:**
  ```
  candidates = listNamespaces() where name starts with "<env>-"     // the legacy "production" never matches
  inBuild    = candidates with no publishedAt and syncedAt < 1 hour ago   // a build may still be using it
  keep       = { live } + inBuild + top 4 of (published candidates - live) by publishedAt
  delete     = candidates - keep    // unpublished orphans older than 1 hour go first; errors logged, never thrown
  ```
- **The plugin is thin.** `plugins/prune-vectors/` (`manifest.yml` + `index.js`) calls `utils.run.command("npx tsx scripts/prune-vectors.ts")` in `onSuccess`. The logic lives in a TypeScript script that imports `lib/` (the namespace name, the Pinecone client), so the evals can test it against the existing fake namespace, which gains `update`, `listNamespaces` and `deleteNamespace`.
- **The legacy `production` namespace is left alone.** Deploys from before this change bake `production`, so rollbacks to them keep working as they do today.

### 4. Cache guard: meaning-search health travels with the answer

- `searchWithTrace` returns `dense: { ok: boolean, hits: number }`:
  - `ok` is false when the search was skipped (no key) or Pinecone threw.
- `runAgent` adds these up over every search in the run into `AgentResult.search = { meaningOk, meaningHits }`:
  - `meaningOk` is true only if every search's `ok` is true.
  - `meaningHits` is the total number of dense hits across the run.
- `isCacheable` (from `cache-miso-answers`) also requires `meaningOk && meaningHits > 0`.
- This one rule covers three cases: Pinecone down, a pruned namespace (always 0 hits), and a deploy with no Pinecone key.
- **Alternative considered:** checking for namespace existence at runtime. That's an extra Pinecone call per question to detect something the hit count already shows.

### 5. Full re-embed per content snapshot: an accepted waste, with a trigger to revisit

Two independent choices are involved: **what** gets embedded (everything, or only the changed chunks) and **where** it's written (in place, or into a new snapshot).

```
                     write in place (mutate live)    write a new snapshot (immutable)
embed everything     worst of both                   THIS DESIGN: safe, redoes unchanged work
embed only changed   today: cheap, live reads a      ideal: safe and cheap
                     namespace mid-change
```

- **The bug being fixed is mutating the namespace that live traffic reads, not the delta sync.** Embedding only changed chunks is strictly better on cost.
- **This design fills an empty namespace, so a one-character edit to indexed content re-embeds the whole corpus.** That's a side effect of how isolation is achieved, not a goal. Chunking is not the cost: `buildIndex()` re-chunks everything on every build anyway, locally, in milliseconds.
- **What the waste costs at this scale:** about 6K embedding tokens (43 chunks) per content-changing deploy. That's up to about 6 such deploys a month (6 of 12 commits touched content), so about 36K tokens a month, plus a few seconds of build time. It's small next to the Starter plan's embedding allowance (check the exact figure on Pinecone's pricing page before quoting it).
- **How it grows:** corpus tokens × deploys that change content. With a 1M-token corpus deploying daily, it would be about 30M tokens a month and minutes per build.
- **Alternatives considered:**
  - **Copy unchanged vectors forward** (fetch values from the live namespace, upsert them into the new one, embed only changed chunks). Rejected. Pinecone's current document-index API makes it impossible: the derived vectors "are internal and aren't returned", and a vector on an embedded field is "rejected with a 400" (docs.pinecone.io/guides/search/integrated-embedding). Whether the older Records API this index uses allows it is unverified. Relying on it would tie the design to an API Pinecone is moving away from.
  - **Content-addressed records in one namespace.** This is the path to switch to, deferred. Each record is immutable with ID `chunkId@hash(embedded text)`. Each deploy bakes a manifest of its record IDs and filters every search with `$in` on that manifest. Unchanged chunks are shared across deploys and embedded once ever. After publish, records that no kept version's manifest references are deleted. It embeds only changed chunks, never touches what's live, keeps rollbacks working and removes the namespace cap. It's deferred because cleanup needs the manifests of the kept versions, and on Netlify those have no natural home: `onSuccess` can only write its own deploy store, and reading other deploys' stores needs deploy IDs via the Netlify API. It's solvable (for example, a "last published" stamp on records), but it's real extra machinery for about 6K tokens.
- **When to switch to content-addressed records:**
  - a full re-embed exceeds 10% of the monthly embedding allowance, **or**
  - it adds more than 10 s to the build, **or**
  - the corpus passes about 50K tokens.

  The sync log already reports chunk counts. Task 6.2 also records the embed time, so the trigger can be checked.
- **A smaller related waste, also accepted:** `hashOf()` covers href, source and project as well as the embedded text, so a metadata-only change (such as a renamed project URL) re-embeds its chunks. Splitting it into an embedding hash and a metadata hash would fix that. It's bundled into the same switch, because content-addressed records key on the embedding hash only.

## Risks / Trade-offs

- [Pinecone's metadata-only `update` re-embeds the record, or isn't supported on integrated-embedding indexes.] → **Checked 2026-11-21 (task 1.1), not a problem:** on a scratch namespace of this index, `update({ id, metadata: { syncedAt } })` merged the new field and left the 1,024-dim vector bit-for-bit identical, with `content` and `hash` kept. `listNamespaces()` returns each name with its record count. The fallback below is no longer needed. Original note: task 1.1 checks this first. Fallback: skip pruning and log a warning once more than 80 namespaces exist. At about 6 content deploys a month that is years of headroom, and the cleanup becomes manual.
- [A content deploy now embeds the full corpus (about 6K tokens) instead of only the changed chunks.] → Accepted at this scale, with a measured trigger and a named path to switch to (Decision 5).
- [Two builds running at once: one prunes while the other is mid-sync.] → An unpublished namespace synced less than an hour ago is never pruned, and Netlify runs one build at a time per site on this plan. The remaining window is only the seconds before the sync writes `syncedAt`.
- [A rollback past the 5 most recent versions degrades to keyword search.] → Accepted (degraded mode). The guard keeps those answers out of the caches, and the next deploy restores full search.
- [The corpus hash differs between `next.config` and the sync script.] → Both call one pure function over the same files in the same build. An eval asserts the hash is stable across runs and changes on an edit, and the sync script logs the name, so a mismatch is visible in the build log.
- [The first deploy after merging embeds everything into `production-<hash>`.] → A one-time ~6K tokens. The legacy namespace is untouched, so rolling back across the change still works.

## Migration Plan

1. Merge after `cache-miso-answers`. The first build creates `production-<hash>`, and the build log shows the name and "43 upserted".
2. Check: the next styling-only deploy logs "0 upserted" with the same name, and the trace shows meaning search hits.
3. Rollback: revert the commit. The next build bakes `production` again and resyncs it in place, which is the old behaviour. Hashed namespaces can then be deleted from the Pinecone console.
