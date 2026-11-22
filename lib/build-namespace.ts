import { buildIndex } from "./search-index";
import { corpusHash } from "./vector-store";
import { resolveNamespace } from "./namespace";

/**
 * The namespace this build syncs into and searches, computed from the content on disk. Used by
 * next.config.ts (which bakes it into the server bundle) and the build scripts, so all of them agree.
 */
export const buildNamespace = (env: NodeJS.ProcessEnv = process.env) => resolveNamespace(env, () => corpusHash(buildIndex()));

/** Pins the namespace for the rest of this process (build scripts), so every later lookup uses it. */
export function pinBuildNamespace(): string {
  const ns = buildNamespace();
  process.env.PINECONE_NAMESPACE = ns;
  return ns;
}
