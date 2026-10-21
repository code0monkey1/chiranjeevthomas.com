/**
 * Pinecone namespace for the chat's records, so deploy previews and local work never overwrite production.
 * Netlify sets CONTEXT during builds ("production", "deploy-preview", "branch-deploy"); anything else is local.
 * next.config.ts bakes the result into the server bundle, since CONTEXT isn't guaranteed at function runtime.
 */
export function resolveNamespace(env: NodeJS.ProcessEnv = process.env): string {
  if (env.PINECONE_NAMESPACE) return env.PINECONE_NAMESPACE;
  if (env.CONTEXT === "production") return "production";
  if (env.CONTEXT) return "preview";
  return "local";
}
