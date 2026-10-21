import { NextResponse } from "next/server";
import { MODEL, retrievalAnswer, runAgent, type Turn } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT || 30);
const hits = new Map<string, { day: string; n: number }>(); // best-effort per instance

function limited(ip: string) {
  const day = new Date().toISOString().slice(0, 10);
  const cur = hits.get(ip);
  if (!cur || cur.day !== day) { hits.set(ip, { day, n: 1 }); return false; }
  cur.n += 1;
  return cur.n > DAILY_LIMIT;
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

  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json(await retrievalAnswer(question));
  // Stream NDJSON: trace steps as they happen, answer tokens as Groq writes them, then the final result.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const result = await runAgent(question, history, key, fetch, {
          step: (step) => send({ type: "step", step }),
          token: (text) => send({ type: "token", text }),
          reset: () => send({ type: "reset" }),
        });
        send({ type: "done", result });
      } catch (e) {
        console.error("chat agent failed, falling back to retrieval:", (e as Error).message);
        const status = /groq (\d+)/.exec((e as Error).message)?.[1];
        send({ type: "reset" });
        send({ type: "done", result: await retrievalAnswer(question, { kind: "err", label: `LLM call failed${status ? ` (Groq ${status})` : ""}`, detail: "answering from search results only, with the question as typed" }) });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
