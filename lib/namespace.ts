/**
 * Pinecone namespace for the chat's records.
 *
 * - Netlify builds (CONTEXT set): "<env>-<corpus hash>", e.g. "production-3fa9c1e2". Each version of the
 *   content gets its own namespace, so a build never changes what the live site is searching: unchanged
 *   content reuses its namespace (nothing embedded), changed content fills a new one.
 * - Local runs (no CONTEXT): the editable "local" namespace, synced in place as content changes.
 * - PINECONE_NAMESPACE, when set, wins: next.config.ts bakes the build's name into the server bundle
 *   through it, the build scripts set it for the rest of their process, and evals can pin one.
 *
 * `corpus` returns the corpus hash. It is a callback so this module stays dependency-free and the
 * hash is only computed in Netlify builds (see lib/build-namespace.ts).
 */
export function resolveNamespace(env: NodeJS.ProcessEnv = process.env, corpus?: () => string): string {
  if (env.PINECONE_NAMESPACE) return env.PINECONE_NAMESPACE;
  if (!env.CONTEXT) return "local";
  if (!corpus) throw new Error("resolveNamespace: Netlify build contexts need the corpus hash (use buildNamespace())");
  return `${env.CONTEXT === "production" ? "production" : "preview"}-${corpus()}`;
}

/** The environment prefix of a hashed namespace ("production-" / "preview-"), or null for local. */
export const namespacePrefix = (env: NodeJS.ProcessEnv = process.env) => (env.CONTEXT ? `${env.CONTEXT === "production" ? "production" : "preview"}-` : null);
