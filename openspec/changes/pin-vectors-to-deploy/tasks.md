# Tasks

## 1. Spike

- [x] 1.1 Against a scratch namespace in the real index, upsert a record, call a metadata-only `update` setting `syncedAt`, then fetch it; verify the `content`/`hash` metadata are unchanged and Pinecone's embedding-token usage did not increase; record the result in design.md (if unsupported, switch task 4.2 to the "warn above 80 namespaces" fallback)

## 2. Content-addressed namespace

- [x] 2.1 Add `corpusHash(chunks)` next to `hashOf` in `lib/vector-store.ts` (sorted per-chunk hashes, 8 hex chars); verify `npm run eval:chat` still passes the vector-sync cases unchanged
- [x] 2.2 Extend `resolveNamespace()` to return `production-<hash>` / `preview-<hash>` in Netlify contexts, keeping `local` and the `PINECONE_NAMESPACE` override; add eval cases: same content → same name across two calls, one edited chunk → different name, shuffled chunk order → same name, no CONTEXT → `local`
- [x] 2.3 Point `scripts/sync-vectors.ts` at the hashed namespace (no algorithm change) and log the name; verify with `CONTEXT=production npx tsx scripts/sync-vectors.ts` twice: first run upserts all chunks into the new name, second run upserts 0
- [x] 2.4 Verify `next.config.ts` bakes the same name the sync used: run `CONTEXT=production npm run build` and compare the sync log line with `PINECONE_NAMESPACE` in `.next/required-server-files.json` (or a debug log)

## 3. Search-health guard

- [x] 3.1 Return `dense: { ok, hits }` from `searchWithTrace` and aggregate `search: { meaningOk, meaningHits }` on `AgentResult` (including `retrievalAnswer`); add eval cases: fake dense throwing → `meaningOk: false`; fake dense returning [] → `meaningHits: 0`; healthy fake → both set
- [x] 3.2 Require `meaningOk && meaningHits > 0` in `isCacheable` (`lib/answer-cache.ts`); add eval cases proving a grounded, cited, primary-model answer is rejected when either condition fails and accepted when both hold

## 4. Pruning after publish

- [x] 4.1 Add `stamp(namespace, field)` (metadata-only update on the `profile` record) and write `syncedAt` at the end of a successful sync; extend the eval fake namespace with `update`; verify the fake records the stamp and the stored `hash` survives
- [x] 4.2 Write `scripts/prune-vectors.ts`: stamp `publishedAt` on the live namespace, list namespaces with the `<env>-` prefix, keep live + unpublished namespaces synced < 1 h ago + top 4 published by `publishedAt`, delete the rest, catch and log every error, exit 0; add eval cases with a fake index: 7 published namespaces → 5 kept including live; D1–D5 published, D6 synced-but-failed 2 h ago, D7 live → D6's orphan is deleted before any published namespace; a namespace synced 5 min ago with no `publishedAt` is kept; a reverted (old-named) live namespace is kept; legacy `production` is never touched; a delete error doesn't throw
- [x] 4.3 Create the local build plugin `plugins/prune-vectors/` (`manifest.yml`, `index.js` running the script in `onSuccess`) and register it in `netlify.toml`; verify locally with `netlify build --context production` (or the plugin's unit invocation) that `onSuccess` runs the script, and that a forced build failure skips it — verified on Netlify (deploy preview 1): preview-42f3b881 got syncedAt 02:07:22 and publishedAt 02:09:12 from onSuccess after publish; unit invocation confirmed the command and that errors are swallowed; skip-on-failure is Netlify's documented onSuccess lifecycle (not reproducible locally without the Netlify CLI)

## 5. Docs

- [x] 5.1 Rewrite the README section "Keeping the vectors current" (namespaces per content hash, the build never touching the live namespace, pruning after publish, rollback behaviour and the degraded mode) and the namespaces bullet; verify links and the namespace names match the code

## 6. Integration verification

- [x] 6.1 `npm run eval:chat`, `npx tsc --noEmit` and `npm run build` pass
- [ ] 6.2 On production after merge: the build log shows `production-<hash>` with all chunks upserted, and the full-embed duration and token count are recorded against the Decision 5 switch trigger; a following CSS-only deploy shows the same name and 0 upserted; during a content deploy's build, the live chat's trace still shows meaning-search hits for the old content
- [ ] 6.3 Publish an older deploy within retention and verify its trace shows meaning-search hits; check the Pinecone console shows at most 5 `production-*` namespaces after the next deploy

## Workflow follow-up

- Archive after `cache-miso-answers` has been archived, so the `chat-answer-cache` requirement added here lands in an existing main spec.
