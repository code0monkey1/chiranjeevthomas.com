/**
 * Syncs the chat chunks to Pinecone, which embeds them with its hosted model.
 * Runs before every `npm run build`, into the build's own namespace (one per version of the content,
 * see lib/namespace.ts), so a build never changes what the live site is searching.
 * Only chunks missing from that namespace, or changed, are embedded: an unchanged version embeds nothing,
 * a new version fills a new namespace, and a half-written one (a killed build) is completed.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { buildIndex } = await import("../lib/search-index");
  const { ensureIndex, syncRecords, vectorSearchEnabled, INDEX_NAME, EMBED_MODEL } = await import("../lib/vector-store");
  const { pinBuildNamespace } = await import("../lib/build-namespace");
  const { getNamespace, stamp } = await import("../lib/vector-store");

  if (!vectorSearchEnabled()) {
    console.log("sync:vectors: PINECONE_API_KEY not set, skipping. The chat will use keyword search only.");
    return;
  }
  const t0 = Date.now();
  if (await ensureIndex()) console.log(`sync:vectors: created index "${INDEX_NAME}" (${EMBED_MODEL})`);
  const chunks = buildIndex();
  const name = pinBuildNamespace();
  const ns = getNamespace(name);
  const r = await syncRecords(chunks, ns);
  // Embedding tokens are estimated at ~4 characters per token; recorded to check the full re-embed tradeoff
  // (pin-vectors-to-deploy design, Decision 5).
  const embedded = chunks.filter((c) => r.changedIds.includes(c.id)).reduce((n, c) => n + c.title.length + c.text.length + 2, 0);
  console.log(`sync:vectors: ${chunks.length} chunks → ${INDEX_NAME}/${name}: ${r.upserted} upserted (~${Math.round(embedded / 4)} tokens embedded), ${r.deleted} deleted, ${r.unchanged} unchanged (${Date.now() - t0}ms)`);
  // Marks this namespace as in use by a build, so pruning after another deploy can't delete it mid-build.
  if (name !== "local") await stamp(ns, "syncedAt");
  // Pinecone makes upserts searchable within a few seconds. The next build step (precompute:answers)
  // searches the index, so give it time to see this build's content.
  if (r.upserted || r.deleted) {
    console.log("sync:vectors: waiting 5s for Pinecone to index the changes");
    await new Promise((res) => setTimeout(res, 5000));
  }
}

main().catch((err) => {
  // Fail the build: deploying content whose vectors are stale would give wrong chat answers.
  console.error("sync:vectors failed:", err);
  process.exit(1);
});
