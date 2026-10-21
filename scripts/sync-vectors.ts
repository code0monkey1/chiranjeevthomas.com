/**
 * Syncs the chat chunks to Pinecone, which embeds them with its hosted model.
 * Runs before every `npm run build`, so each Netlify deploy ships with up-to-date vectors.
 * Only new or changed chunks are re-embedded; deleted ones are removed.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { buildIndex } = await import("../lib/search-index");
  const { ensureIndex, syncRecords, vectorSearchEnabled, INDEX_NAME, EMBED_MODEL } = await import("../lib/vector-store");
  const { resolveNamespace } = await import("../lib/namespace");

  if (!vectorSearchEnabled()) {
    console.log("sync:vectors: PINECONE_API_KEY not set, skipping. The chat will use keyword search only.");
    return;
  }
  const t0 = Date.now();
  if (await ensureIndex()) console.log(`sync:vectors: created index "${INDEX_NAME}" (${EMBED_MODEL})`);
  const chunks = buildIndex();
  const r = await syncRecords(chunks);
  console.log(`sync:vectors: ${chunks.length} chunks → ${INDEX_NAME}/${resolveNamespace()}: ${r.upserted} upserted, ${r.deleted} deleted, ${r.unchanged} unchanged (${Date.now() - t0}ms)`);
}

main().catch((err) => {
  // Fail the build: deploying content whose vectors are stale would give wrong chat answers.
  console.error("sync:vectors failed:", err);
  process.exit(1);
});
