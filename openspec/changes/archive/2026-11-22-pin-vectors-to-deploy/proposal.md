# Proposal

## Why

Every build syncs the chat's vectors into one mutable Pinecone namespace (`production`) before `next build` runs. The live site's chat therefore searches content that isn't published yet for the whole build (about 65 s). A build that fails after the sync leaves production answering from that unpublished content until the next good deploy. And a Netlify rollback brings back the old pages but keeps the newest vectors. The code already works around this mismatch (`lib/search-index.ts:180`, "a record from a newer deploy"). With `cache-miso-answers` caching answers for a deploy's whole lifetime, a mismatched answer would now stick, so the vectors must belong to the deploy as well.

## What Changes

- **Content-addressed namespaces.** Each Netlify build syncs into a namespace named after a hash of its corpus (`production-<hash8>`, or `preview-<hash8>` for any future deploy preview), and that name is baked into the build. A build with unchanged content reuses the same namespace and embeds nothing. A build with changed content fills a new namespace (about 6K embedding tokens for the whole corpus) and leaves the live namespace untouched. The live site switches namespaces when Netlify publishes the deploy, in one step.
- **Self-healing sync.** The existing delta sync runs against the target namespace, so a namespace left half-written by a killed build is completed by the next build with the same content.
- **Pruning after publish.** A local Netlify build plugin runs in `onSuccess`, which happens after the new deploy is live. It stamps the live namespace as published, then keeps the live one plus the 4 most recently published in the same environment. Orphans left by failed builds are deleted first, and a namespace a build may still be using is never deleted. A failed build never prunes, and pruning can never delete the namespace that is serving traffic.
- **Accepted degraded mode.** Rolling back further than the retention window leaves that deploy with no vectors. Its chat answers with keyword search over its own bundled content, which is correct but weaker. That case is accepted, not repaired.
- **Degraded answers are never cached.** An answer produced without a working meaning search (Pinecone down, or the namespace pruned) is not written to either answer cache, so a weaker answer can't stick for a deploy's lifetime.
- Local development is unchanged: the fixed `local` namespace, edited in place on the next question.

## Capabilities

### New Capabilities
- `chat-vector-index`: How the chat's search vectors are versioned per deploy, synced during the build, kept consistent with the deploy that serves them, and pruned.

### Modified Capabilities
<!-- None in openspec/specs/. The cache guard is added to `chat-answer-cache`, which the in-flight
     change `cache-miso-answers` introduces; this change must be archived after that one. -->
- `chat-answer-cache`: adds the rule that answers produced without a working meaning search are not cached. This is an ADDED requirement on the capability introduced by `cache-miso-answers`.

## Impact

- **Code:**
  - `lib/namespace.ts`: the name now includes a corpus hash in Netlify build contexts.
  - `lib/vector-store.ts`: a corpus-hash helper, and the `syncedAt` / `publishedAt` stamps.
  - `scripts/sync-vectors.ts`: targets the hashed namespace.
  - `next.config.ts`: unchanged call, new value.
  - New local build plugin `plugins/prune-vectors/`, registered in `netlify.toml`.
  - `lib/search-index.ts` and `lib/agent.ts`: report meaning-search health so the cache can check it.
  - `lib/answer-cache.ts`: the guard.
  - README "Keeping the vectors current".
- **Pinecone:** up to 5 production namespaces at a time, against the Starter plan's 100. About 6K embedding tokens per content-changing deploy, instead of embedding only the changed chunks.
- **Ordering:** implement and archive after `cache-miso-answers`.
- **No new dependencies.**
