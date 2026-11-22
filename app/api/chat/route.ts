import { NextResponse, after } from "next/server";
import { MODEL, retrievalAnswer, runAgent, type AgentResult, type Step, type Turn } from "@/lib/agent";
import { cachedTrace, type CachedAnswer } from "@/lib/answer-cache";
import { answerStore, cacheSkipReason, questionKey, type AnswerStore } from "@/lib/answer-store";
import { limited, takeUpgrade } from "@/lib/chat-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The visitor's IP. On Netlify only the platform-set header is trusted: X-Forwarded-For can be
 * prefixed by the client, so falling back to it would let anyone reset their quota per request.
 */
function clientIp(req: Request) {
  const netlify = req.headers.get("x-nf-client-connection-ip");
  if (netlify) return netlify;
  if (process.env.NETLIFY) return "unknown"; // header missing on Netlify: share one bucket rather than trust the client
  return req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

/** A fallback-model entry is first upgraded after the next Groq token window, then at most once per cooldown. */
const FIRST_UPGRADE_MS = 60_000;
const UPGRADE_COOLDOWN_MS = 10 * 60_000;
/** Keys whose upgrade is running on this instance. */
const upgrading = new Set<string>();
/** The question's hash prefix for logs. Never the question itself. */
const logKey = (cacheKey: string) => cacheKey.slice(2, 14);
/** Run after the response has finished; outside a Next request (evals) run in the background. */
const afterResponse = (job: () => Promise<void>) => { try { after(job); } catch { void job(); } };

/**
 * A hit written by the fallback model is served as is; once its cooldown has passed, one silent run on the
 * main model replaces it. The claim (a pushed-out `upgradeAfter`) is written first so other instances back
 * off, and nothing is overwritten unless the new answer is cacheable and from the main model.
 */
function maybeUpgrade(store: AnswerStore, cacheKey: string, question: string, hit: CachedAnswer, groqKey: string | undefined) {
  if (hit.model === MODEL || !groqKey || upgrading.has(cacheKey)) return;
  const dueAt = hit.upgradeAfter ? Date.parse(hit.upgradeAfter) : Date.parse(hit.createdAt) + FIRST_UPGRADE_MS;
  if (!(Date.now() >= dueAt) || !takeUpgrade()) return;
  upgrading.add(cacheKey);
  afterResponse(async () => {
    try {
      await store.set(cacheKey, { ...hit, upgradeAfter: new Date(Date.now() + UPGRADE_COOLDOWN_MS).toISOString() });
      const r = await runAgent(question, [], groqKey);
      const reason = cacheSkipReason(r) ?? (r.model === MODEL ? null : "still-fallback");
      if (reason) console.info(`[answer-cache] upgrade skipped ${reason} key=${logKey(cacheKey)}`);
      else await store.set(cacheKey, { result: r, model: MODEL, createdAt: new Date().toISOString() });
    } catch (e) {
      console.warn(`[answer-cache] upgrade failed key=${logKey(cacheKey)}: ${(e as Error).message.slice(0, 120)}`);
    } finally { upgrading.delete(cacheKey); }
  });
}

/** Health check: tells the page whether live answers are available. Never reveals the key. */
export async function GET() {
  return NextResponse.json({ live: Boolean(process.env.GROQ_API_KEY), model: process.env.GROQ_API_KEY ? MODEL : null });
}

export async function POST(req: Request) {
  let body: { question?: unknown; history?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 400) : "";
  if (!question) return NextResponse.json({ error: "empty question" }, { status: 400 });
  const history: Turn[] = Array.isArray(body.history)
    ? body.history
        .filter((t): t is Turn => !!t && typeof t === "object" && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .slice(-8)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 1200) }))
    : [];

  // First questions (no history) can be answered from this deploy's cache. Follow-ups depend on the
  // conversation, so they never read or write it. The lookup comes before the rate limit: a hit costs
  // no LLM or search quota, so it doesn't count against the visitor.
  const store = history.length === 0 ? answerStore() : null;
  const cacheKey = store ? questionKey(question) : "";
  let cacheStep: Step | null = null;
  if (store) {
    const t0 = performance.now();
    const hit = await store.get(cacheKey);
    const ms = Math.round(performance.now() - t0);
    if (hit) {
      maybeUpgrade(store, cacheKey, question, hit, process.env.GROQ_API_KEY);
      return ndjson([{ type: "done", result: { ...hit.result, trace: cachedTrace(hit, "runtime", ms) } }]);
    }
    cacheStep = { kind: "think", label: `Cache miss · ${ms}ms`, detail: "no stored answer for this question in this deploy, so the agent runs" };
  }

  if (limited(clientIp(req))) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json(await retrievalAnswer(question));

  // The cache write runs after the response has finished (after() keeps the function alive for it), so it
  // never delays the answer: the client only completes when the stream closes.
  let finish!: (r: AgentResult | null) => void;
  const finished = new Promise<AgentResult | null>((res) => (finish = res));
  if (store) {
    const write = async () => {
      const result = await finished;
      if (!result) return console.info(`[answer-cache] skip no-result key=${logKey(cacheKey)}`);
      const reason = cacheSkipReason(result);
      if (reason) return console.info(`[answer-cache] skip ${reason} key=${logKey(cacheKey)}`);
      const model = result.model ?? MODEL;
      // Never downgrade: a main-model entry (maybe written by another instance meanwhile) stays.
      if (model !== MODEL && (await store.get(cacheKey))?.model === MODEL) return console.info(`[answer-cache] skip primary-exists key=${logKey(cacheKey)}`);
      await store.set(cacheKey, { result, model, createdAt: new Date().toISOString() });
    };
    afterResponse(write);
  }

  // Stream NDJSON: trace steps as they happen, answer tokens as Groq writes them, then the final result.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      let cacheable: AgentResult | null = null;
      try {
        if (cacheStep) send({ type: "step", step: cacheStep });
        const result = await runAgent(question, history, key, fetch, {
          step: (step) => send({ type: "step", step }),
          token: (text) => send({ type: "token", text }),
          reset: () => send({ type: "reset" }),
        });
        // The miss step is shown, but not stored: a later cache hit replays only the agent's own steps.
        send({ type: "done", result: cacheStep ? { ...result, trace: [cacheStep, ...result.trace] } : result });
        cacheable = result;
      } catch (e) {
        console.error("chat agent failed, falling back to retrieval:", (e as Error).message);
        const status = /groq (\d+)/.exec((e as Error).message)?.[1];
        try {
          send({ type: "reset" });
          send({ type: "done", result: await retrievalAnswer(question, { kind: "err", label: `LLM call failed${status ? ` (Groq ${status})` : ""}`, detail: "answering from search results only, with the question as typed" }) });
        } catch { /* the visitor left; nothing to send */ }
      } finally {
        try { controller.close(); } catch { /* already closed by a disconnect */ }
        finish(cacheable);
      }
    },
  });
  return new Response(stream, { headers: NDJSON_HEADERS });
}

const NDJSON_HEADERS = { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" };
const ndjson = (events: object[]) => new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", { headers: NDJSON_HEADERS });
