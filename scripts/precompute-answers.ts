/**
 * Precomputes the answers to the chat's suggestion bubbles at build time, so clicking one shows the
 * answer instantly with no request. Runs after sync:vectors, so it searches this build's content.
 *
 * Writes lib/generated/answers.json, which ships in the client bundle. Only answers that pass the same
 * rule as the runtime cache (isCacheable) are kept; any failure just leaves that bubble to answer live.
 * Never fails the build.
 *
 *   --skip-llm   write empty suggestions without calling the model (dev, evals, type-checking)
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

const OUT = path.join(process.cwd(), "lib", "generated", "answers.json");
/** Groq's free tier allows 8K tokens a minute; each answer uses a few thousand, so space the runs out. */
const GAP_MS = 8000;

async function main() {
  const { SUGGESTIONS } = await import("../lib/suggestions");
  const { normalizeQuestion } = await import("../lib/answer-cache");
  const suggestions: Record<string, unknown> = {};
  const write = () => {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), suggestions }, null, 2) + "\n");
  };

  const key = process.env.GROQ_API_KEY;
  if (process.argv.includes("--skip-llm") || !key) {
    if (!process.argv.includes("--skip-llm")) console.warn("precompute:answers: GROQ_API_KEY not set, suggestion bubbles will answer live");
    write();
    return;
  }

  const { runAgent, MODEL } = await import("../lib/agent");
  const { isCacheable } = await import("../lib/answer-store");
  for (const [i, q] of SUGGESTIONS.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
    const t0 = Date.now();
    try {
      let r = await runAgent(q, [], key);
      // A busy minute can push a run onto the fallback model, whose answers aren't cached. Try once more.
      if (!isCacheable(r) && r.model !== MODEL) {
        await new Promise((res) => setTimeout(res, 20_000));
        r = await runAgent(q, [], key);
      }
      if (isCacheable(r)) {
        suggestions[normalizeQuestion(q)] = { result: r, model: r.model, createdAt: new Date().toISOString() };
        console.log(`precompute:answers: ✓ "${q}" (${Date.now() - t0}ms, ${r.sources.length} sources)`);
      } else {
        console.warn(`precompute:answers: ✗ "${q}" not cacheable (mode ${r.mode}, grounded ${r.grounded}, model ${r.model}), answers live`);
      }
    } catch (err) {
      console.warn(`precompute:answers: ✗ "${q}" failed (${(err as Error).message.slice(0, 120)}), answers live`);
    }
  }
  write();
  console.log(`precompute:answers: ${Object.keys(suggestions).length}/${SUGGESTIONS.length} suggestions precomputed → ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  // Never fail the build over this: write what we have (possibly nothing) and let the bubbles answer live.
  console.warn("precompute:answers failed:", err);
  try { fs.mkdirSync(path.dirname(OUT), { recursive: true }); if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), suggestions: {} }) + "\n"); } catch { /* nothing more to do */ }
});
