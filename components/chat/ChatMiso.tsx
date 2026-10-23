"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { RagdollCat, MOOD_TEXT, type Mood } from "./RagdollCat";
import { ChaseLoader } from "./ChaseLoader";
import { CloseIcon, ResetIcon } from "../Icons";

type Source = { title: string; href: string };
type Msg = { role: "user" | "bot"; text: string; sources?: Source[]; pending?: boolean; streaming?: boolean };
type Result = { answer: string; sources: Source[]; trace: Step[]; grounded: boolean; mode: "live" | "demo" };

/** While tokens stream in, hide citation markers (and a half-written one at the end) and Markdown bold. */
const liveText = (raw: string) => raw.replace(/\s*\[[a-z0-9-]*\]/g, "").replace(/\s*\[[a-z0-9-]*$/, "").replace(/\*\*/g, "").trimStart();

/** Reads the chat API's NDJSON stream: trace steps, answer tokens, then the final result. */
async function readEvents(res: Response, on: { step: (s: Step) => void; token: (t: string) => void; reset: () => void }): Promise<Result> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result: Result | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const e = JSON.parse(line);
      if (e.type === "step") on.step(e.step);
      else if (e.type === "token") on.token(e.text);
      else if (e.type === "reset") on.reset();
      else if (e.type === "done") result = e.result;
    }
  }
  if (!result) throw new Error("stream ended early");
  return result;
}
type Step = { kind: "goal" | "think" | "tool" | "step" | "done" | "err"; label: string; detail: string };

const INTRO =
  "Meow! I’m Miso. I’ve watched Chiranjeev build every one of his projects, so ask me anything about his work. I’ll dig through his portfolio and show you exactly where I found each answer.";
const SUGGESTIONS = [
  "What has he shipped with LLMs in production?",
  "How does InvoiceChaser keep a human in the loop?",
  "What’s his experience with RAG?",
  "Is he a fit for a senior full-stack AI role?",
];
const EMOTE_LINES: Record<string, string> = {
  smile: "There you go — my best smile. Ask me anything about Chiranjeev’s work whenever you’re ready.",
  smirk: "Oh, I know a thing or two about Chiranjeev’s projects… ask me and find out.",
  laugh: "Ha! That tickled my whiskers. Now, want to hear about his agent projects?",
  cry: "Sniff… okay, I’m fine. Talking about InvoiceChaser always cheers me up — want to hear about it?",
};
const SPARKS: Array<[number, number]> = [[3,6],[18,-1],[36,2],[55,-1],[74,2],[92,-1],[98,22],[99,48],[97,76],[86,97],[64,99],[42,96],[22,99],[4,94],[0,70],[1,38]];
const DOT: Record<Step["kind"], string> = { goal: "#0C0A09", think: "#F4A460", tool: "#E8955A", step: "#D6D3D1", done: "#15803D", err: "#B91C1C" };

/** Short commands like "smile" or "can you cry?" make Miso act instead of searching. */
function emotion(q: string): Mood | null {
  const t = q.toLowerCase();
  if (t.split(/\s+/).length > 6) return null;
  if (/\b(project|projects|portfolio|work|experience|skills?|job|role|hire|agent|agents|rag|llm|ai|invoice\w*|grabbit|devreferral|stack|about|tell|what|who|why|how|when|where|which|does|did|is|are|has|have)\b/.test(t)) return null;
  if (/\bsmirk(s|ing)?\b/.test(t)) return "smirk";
  if (/\b(laugh(s|ing)?|lol|haha+|giggle)\b/.test(t)) return "laugh";
  if (/\b(cry|cries|crying|tears|weep)\b/.test(t)) return "cry";
  if (/\b(smile|smiles|smiling)\b/.test(t)) return "smile";
  return null;
}

/** `onClose` adds a close button, for when the chat is shown in a dialog. */
export function ChatMiso({ onClose }: { onClose?: () => void } = {}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: INTRO }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<Step[]>([]);
  const [elapsed, setElapsed] = useState("");
  const [firstWords, setFirstWords] = useState("");
  // On narrow screens the trace sits under the chat, so it starts collapsed there.
  const [showTrace, setShowTrace] = useState(false);
  const [mode, setMode] = useState<"checking" | "live" | "demo">("checking");
  const [mood, setMood] = useState<Mood>("idle");
  const [wish, setWish] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const traceRef = useRef<HTMLOListElement>(null);
  const ctl = useRef<AbortController | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => setMode(d.live ? "live" : "demo")).catch(() => setMode("demo"));
  }, []);
  // JS smooth scrolling isn't covered by the CSS reduced-motion rule.
  const scrollBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: scrollBehavior() });
  }, [msgs]);
  useEffect(() => {
    traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight, behavior: scrollBehavior() });
  }, [trace]);

  const settle = (m: Mood, ms = 4500) => {
    clearTimeout(moodTimer.current);
    setMood(m);
    moodTimer.current = setTimeout(() => setMood("idle"), ms);
  };

  async function ask(raw: string) {
    const q = raw.trim().slice(0, 400);
    if (!q || busy) return;
    setDraft("");
    setWish((w) => w + 1);
    const emo = emotion(q);
    if (emo) {
      setMsgs((m) => [...m, { role: "user", text: q }, { role: "bot", text: EMOTE_LINES[emo] }]);
      setTrace([{ kind: "goal", label: "Question received", detail: q }, { kind: "think", label: "Expression requested", detail: `${emo} · no search needed` }]);
      setElapsed("");
      settle(emo, 5500);
      return;
    }
    // The server keeps no state: each question carries the last 4 exchanges. Assistant turns note their
    // sources so the model can resolve follow-ups like "what stack did it use?".
    const history = msgs
      .filter((m, i) => i > 0 && !m.pending)
      .slice(-8)
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.sources?.length ? `${m.text}\n(Sources: ${m.sources.map((s) => s.title).join(", ")})` : m.text }));
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "bot", text: "Thinking…", pending: true }]);
    setBusy(true);
    setMood("thinking");
    setTrace([{ kind: "goal", label: "Question received", detail: q }, { kind: "think", label: "LLM reasoning", detail: "deciding whether to search, and for what" }]);
    const t0 = performance.now();
    const secs = () => ((performance.now() - t0) / 1000).toFixed(1) + "s";
    setFirstWords("");
    const searching = setTimeout(() => setMood("searching"), 900);
    ctl.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
        signal: ctl.current.signal,
      });
      let data: Result;
      if (res.ok && (res.headers.get("content-type") ?? "").includes("ndjson")) {
        // Live: show each trace step as it happens and the answer as it's written.
        const live: Step[] = [];
        let text = "";
        let first = true;
        data = await readEvents(res, {
          step: (st) => { live.push(st); setTrace((t) => [t[0], ...live]); },
          token: (tok) => {
            text += tok;
            const shown = liveText(text);
            if (!shown) return;
            if (first) { first = false; clearTimeout(searching); setMood("talking"); setFirstWords(secs()); }
            setMsgs((m) => [...m.slice(0, -1), { role: "bot", text: shown, pending: true, streaming: true }]);
          },
          reset: () => { text = ""; setMsgs((m) => [...m.slice(0, -1), { role: "bot", text: "Thinking…", pending: true }]); },
        });
      } else {
        data = await res.json();
        if (!res.ok) throw Object.assign(new Error((data as unknown as { error?: string }).error || "error"), { code: res.status });
      }
      clearTimeout(searching);
      if (data.mode) setMode(data.mode);
      setTrace((t) => [...t.slice(0, 1), ...data.trace]);
      setMsgs((m) => [...m.slice(0, -1), { role: "bot", text: data.answer, sources: data.sources }]);
      setElapsed(secs());
      settle(data.grounded ? "happy" : "confused");
    } catch (e: unknown) {
      clearTimeout(searching);
      const err = e as { name?: string; code?: number };
      if (err.name === "AbortError") {
        setMsgs((m) => [...m.slice(0, -1), { role: "bot", text: "Stopped." }]);
        setMood("idle");
      } else {
        const text = err.code === 429 ? "I’m getting a lot of questions right now. Please try again in a little while." : "Something went wrong on my side. Please try again.";
        setMsgs((m) => [...m.slice(0, -1), { role: "bot", text }]);
        setTrace((t) => [...t, { kind: "err", label: "Error", detail: String(err.code ?? "network") }]);
        settle("confused");
      }
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    ctl.current?.abort();
    setMsgs([{ role: "bot", text: INTRO }]);
    setTrace([]);
    setElapsed("");
    setDraft("");
    setMood("idle");
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  const atRest = msgs.length === 1;

  return (
    <div className={`chat${busy ? " busy" : ""}`} role="region" aria-label="Ask Miso, an AI assistant that answers questions about Chiranjeev's work" aria-busy={busy}>
      {busy && (
        <span aria-hidden="true">
          <div className="busy-glow" />
          <div className="busy-ring" />
        </span>
      )}
      {wish > 0 && (
        <span key={wish} aria-hidden="true">
          <div className="wish-glow" />
          <div className="wish-ring" aria-hidden="true" />
          <div className="wish-sheen" aria-hidden="true" />
          {SPARKS.map(([x, y], i) => {
            const size = [14, 10, 18, 12][i % 4];
            return (
              <svg key={i} className="spark" aria-hidden="true" viewBox="0 0 24 24" style={{ left: `calc(${x}% - ${size / 2}px)`, top: `calc(${y}% - ${size / 2}px)`, width: size, height: size, animationDelay: `${(0.08 * i).toFixed(2)}s` }}>
                <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={i % 3 === 0 ? "#fff" : i % 3 === 1 ? "#F4A460" : "#FFD9A8"} />
              </svg>
            );
          })}
        </span>
      )}
      <div className="chat-bar">
        <div className="chat-title">
          <span className="cat-wrap">
            <span className="cat-bob" role="img" aria-label={`Miso is ${MOOD_TEXT[mood]}`} style={{ position: "absolute", inset: 0 }}>
              <RagdollCat mood={mood} />
            </span>
            {mood === "thinking" && <span className="cat-badge" style={{ top: -6, right: -12, padding: "3px 7px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--line)" }}><span className="dots"><span /><span /><span /></span></span>}
            {mood === "cry" && <span className="cat-badge" style={{ top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#DCEEFF", border: "1.5px solid #5FA8E8", display: "grid", placeItems: "center" }}><svg width="11" height="13" viewBox="0 0 12 16"><path d="M6 0 C3 5 0 8 0 11 a6 6 0 0 0 12 0 C12 8 9 5 6 0Z" fill="#5FA8E8" /></svg></span>}
            {mood === "laugh" && <span className="cat-badge mono" style={{ top: -10, right: -16, padding: "2px 6px", borderRadius: 999, background: "var(--ink)", color: "var(--on-ink)", fontSize: 10, fontWeight: 700 }}>HA HA</span>}
            {mood === "smirk" && <span className="cat-badge mono" style={{ top: -10, right: -12, padding: "2px 6px", borderRadius: 999, background: "var(--sand-soft)", border: "1px solid var(--sand-2)", color: "var(--sienna)", fontSize: 10, fontWeight: 700 }}>heh</span>}
            {mood === "confused" && <span className="cat-badge" style={{ top: -8, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--ink)", color: "var(--on-ink)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>?</span>}
            {(mood === "happy" || mood === "smile") && <span className="cat-badge" style={{ top: -8, right: -8, color: mood === "happy" ? "#E9735A" : "#F4A460" }}><svg className="twinkle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.7 1.2 4.6 2.6.9-1.4 2.4-2.6 4.6-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg></span>}
          </span>
          <span style={{ minWidth: 0 }}>
            <strong>Psst. Ask me about my human.</strong>
            <small>I’ve napped on his keyboard through every project · <span style={{ color: "var(--sienna)" }}>{MOOD_TEXT[mood]}</span></small>
          </span>
        </div>
        <span className={`mode-pill ${mode === "live" ? "live" : "demo"}`}>{mode === "live" ? "● Live" : mode === "demo" ? "Retrieval only" : "Connecting…"}</span>
        <button type="button" className="icon-btn" onClick={reset} aria-label="Start a new chat"><ResetIcon /></button>
        {onClose && <button type="button" className="icon-btn" onClick={onClose} aria-label="Close chat"><CloseIcon /></button>}
      </div>

      <div className="chat-body">
        <div className="chat-main">
          <div ref={logRef} className={`chat-log${atRest ? " at-rest" : ""}`} role="log" aria-live="polite" aria-label="Conversation">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`} aria-busy={m.streaming || undefined}>
                {m.role === "bot" && <span className="mini-cat" aria-hidden="true"><RagdollCat still size={30} /></span>}
                <div className={`bubble${m.pending && !m.streaming ? " pending" : ""}`}>
                  {m.pending && !m.streaming ? <ChaseLoader mood={mood} /> : m.text}
                  {m.streaming && <span className="caret" aria-hidden="true" />}
                  {m.sources && m.sources.length > 0 && (
                    <span className="sources">
                      {m.sources.map((s) => <a key={s.href + s.title} href={s.href}><span aria-hidden="true">↗ </span>{s.title}</a>)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {/* Before the first question, the suggestions fill the empty log instead of a blank box. */}
            {atRest && (
              <div className="starters" role="group" aria-label="Suggested questions">
                <span className="starters-label">Try asking</span>
                {/* These buttons unmount once asked, so hand focus to the input instead of dropping it on <body>. */}
                {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => { ask(s); document.getElementById("ask-box")?.focus(); }}>{s}</button>)}
              </div>
            )}
          </div>
          <div className="chat-input">
            {!atRest && (
              <div className="suggest" role="group" aria-label="Suggested questions">
                {SUGGESTIONS.map((s) => <button key={s} type="button" disabled={busy} onClick={() => ask(s)}>{s}</button>)}
              </div>
            )}
            <form className="chat-form" onSubmit={onSubmit}>
              <label htmlFor="ask-box" className="sr-only">Ask a question about Chiranjeev’s work</label>
              <input id="ask-box" value={draft} onChange={(e) => { setDraft(e.target.value); if (!busy) setMood(e.target.value ? "listening" : "idle"); }} placeholder="Ask about his AI projects, experience or stack…" autoComplete="off" maxLength={400} />
              {busy ? <button type="button" className="stop" onClick={() => ctl.current?.abort()}>Stop</button> : <button type="submit">Ask</button>}
            </form>
          </div>
        </div>
        <aside className={`trace${showTrace ? " open" : ""}`} aria-label="Agent trace">
          <button type="button" className="trace-toggle" aria-expanded={showTrace} onClick={() => setShowTrace((v) => !v)}>
            {showTrace ? "Hide agent trace" : `Show agent trace${trace.length ? ` (${trace.length} steps)` : ""}`}
          </button>
          <div className="trace-head"><b>AGENT TRACE</b><span>{busy ? (firstWords ? `first words ${firstWords} · writing…` : "running…") : elapsed ? `${firstWords ? `first words ${firstWords} · ` : ""}done in ${elapsed}` : ""}</span></div>
          {trace.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>Ask something. You’ll see the agent decide whether to search, which query it runs over my projects and experience, what it retrieves, and the sources behind the answer.</p>
          ) : (
            <ol ref={traceRef} aria-label="Agent steps">
              {trace.map((t, i) => (
                <li key={i} style={{ animationDelay: `${i * 0.08}s`, ...(t.kind === "step" ? { marginLeft: 16, fontSize: "0.95em" } : {}) }}>
                  <span aria-hidden="true" style={{ flex: "0 0 8px", width: 8, height: 8, marginTop: 5, borderRadius: "50%", background: DOT[t.kind] }} />
                  <span style={{ minWidth: 0 }}><b>{t.label}</b><span className="d">{t.detail}</span></span>
                </li>
              ))}
            </ol>
          )}
          <p className="how">
            <strong style={{ color: "var(--ink)" }}>How it works:</strong>{" "}
            {mode === "demo" ? (
              <>no LLM is connected right now, so your question goes straight to <code className="mono">search_portfolio</code>: a meaning search (Pinecone vector embeddings) and a keyword search, merged into one ranking. Miso quotes the best passages and links where each came from.</>
            ) : (
              <>an LLM (GPT-OSS 120B on Groq) decides when to call <code className="mono">search_portfolio</code>, up to 3 times, optionally limited to one project. Each call runs a meaning search (Pinecone vector embeddings) and a keyword search and merges the two rankings. The LLM answers only from those passages and cites them.</>
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}
