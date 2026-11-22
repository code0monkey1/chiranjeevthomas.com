import { NextResponse, after } from "next/server";
import { MODEL, retrievalAnswer, runAgent, type AgentResult, type Step, type Turn } from "@/lib/agent";
import { cachedTrace } from "@/lib/answer-cache";
import { answerStore, isCacheable, questionKey } from "@/lib/answer-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT || 30);
/** Ceiling across all visitors (per function instance), so one abuser can't burn the free Groq/Pinecone quota. */
const GLOBAL_DAILY_LIMIT = Number(process.env.CHAT_GLOBAL_DAILY_LIMIT || 500);
const MAX_TRACKED_IPS = 5000;

// Best effort: counters live in this function instance's memory and reset on cold starts.
let today = "";
let total = 0;
const hits = new Map<string, number>();

function limited(ip: string) {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== today) { today = day; total = 0; hits.clear(); } // drop yesterday's counters
  if (total >= GLOBAL_DAILY_LIMIT) return true;
  if (!hits.has(ip) && hits.size >= MAX_TRACKED_IPS) hits.delete(hits.keys().next().value!); // bounded memory
  const n = (hits.get(ip) ?? 0) + 1;
  hits.set(ip, n);
  if (n > DAILY_LIMIT) return true;
  total += 1;
  return false;
}

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
    if (hit) return ndjson([{ type: "done", result: { ...hit.result, trace: cachedTrace(hit, "runtime", ms) } }]);
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
      if (result && isCacheable(result)) await store.set(cacheKey, { result, model: result.model ?? MODEL, createdAt: new Date().toISOString() });
    };
    try { after(write); } catch { void write(); } // outside a Next request (evals): write in the background
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
