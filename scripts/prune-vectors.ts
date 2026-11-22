/**
 * Deletes old Pinecone namespaces after a deploy has gone live. Run by the prune-vectors build plugin
 * in onSuccess (plugins/prune-vectors), which Netlify only reaches once the new deploy is published, so
 * the namespace serving visitors is always this build's and can never be pruned. Never fails the deploy.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { vectorSearchEnabled, pruneNamespaces, prunableIndex } = await import("../lib/vector-store");
  const { namespacePrefix } = await import("../lib/namespace");
  const { buildNamespace } = await import("../lib/build-namespace");
  if (!vectorSearchEnabled()) return console.log("prune: PINECONE_API_KEY not set, nothing to prune");
  const prefix = namespacePrefix();
  if (!prefix) return console.log("prune: not a Netlify build (no CONTEXT), nothing to prune");
  await pruneNamespaces(prunableIndex(), buildNamespace(), prefix);
}

main().catch((err) => console.warn("prune: failed, leaving namespaces as they are:", (err as Error).message));
