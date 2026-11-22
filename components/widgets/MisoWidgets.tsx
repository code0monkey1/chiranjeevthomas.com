"use client";
/**
 * Interactive diagrams for the write-up on how Miso answers questions. Each one server-renders its first
 * step (readable without JavaScript), mirrors its state in an aria-live region, keeps controls ≥ 44px,
 * and only moves on its own after the reader presses Play (which also pauses). Animations use CSS
 * keyframes, so the site-wide reduced-motion rule turns them off.
 */
import { useEffect, useState } from "react";
import { FIGURES as F } from "./miso-figures";

/** Step state with an opt-in, pausable auto-advance. */
function useStepper(count: number, ms = 2600) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((n) => (n + 1) % count), ms);
    return () => clearInterval(t);
  }, [playing, count, ms]);
  return { i, set: (n: number) => { setPlaying(false); setI(n); }, playing, toggle: () => setPlaying((p) => !p) };
}

function PlayButton({ playing, toggle }: { playing: boolean; toggle: () => void }) {
  return (
    <button type="button" className="chip-btn" aria-pressed={playing} onClick={toggle}>
      {playing ? "Pause" : "Play"}
    </button>
  );
}

/* ---------- one question, click to cited answer ---------- */
const FLOW = [
  { t: "Question arrives", what: "The browser sends the question and the last 8 messages to /api/chat. Suggestion bubbles never get here: their answers shipped with the page.", where: "components/chat/ChatMiso.tsx → app/api/chat/route.ts" },
  { t: "Cache check", what: "A first question (no history) is looked up in this deploy's answer cache by a hash of its normalised text. A hit returns straight away and skips the rate limit.", where: "lib/answer-store.ts · questionKey, answerStore" },
  { t: "LLM decides", what: "gpt-oss-120b on Groq reads the question and decides whether to search, and rewrites vague follow-ups into a standalone query.", where: "lib/agent.ts · runAgent, round 1" },
  { t: "search_portfolio", what: "The tool call names a query and, optionally, one project to stay inside. Up to 3 searches per question.", where: "lib/agent.ts · searchTool()" },
  { t: "Meaning + keywords", what: "Pinecone embeds the query and returns the nearest chunks; BM25 ranks the same chunks by shared words. Both run on every search.", where: "lib/vector-store.ts · denseSearch, lib/search-index.ts · keywordSearch" },
  { t: "Rank fusion", what: "Reciprocal rank fusion merges the two rankings by position, not score, and the top 4 chunks go back to the LLM with their ids.", where: "lib/search-index.ts · fuse()" },
  { t: "Answer with ids", what: "The LLM writes the answer from those chunks only and ends it with the ids it used, streamed token by token.", where: "lib/agent.ts · runAgent, round 2" },
  { t: "Citations checked", what: "Ids the search never returned are dropped, so a source link can't be invented. A good, grounded first answer is saved to the cache after the response.", where: "lib/agent.ts · finalize(), app/api/chat/route.ts · after()" },
];
function QuestionFlow() {
  const s = useStepper(FLOW.length);
  const d = FLOW[s.i];
  return (
    <div className="widget mw">
      <div className="mw-top">
        <span className="kicker">One live question, step by step ({F.before.groqCalls} LLM calls, {F.before.total} end to end)</span>
        <PlayButton playing={s.playing} toggle={s.toggle} />
      </div>
      <ol className="mw-steps" aria-label="Steps">
        {FLOW.map((f, n) => (
          <li key={f.t}>
            <button type="button" className="node" aria-pressed={n === s.i} aria-current={n === s.i ? "step" : undefined} onClick={() => s.set(n)}>
              <span className="mw-n">{n + 1}</span> {f.t}
            </button>
          </li>
        ))}
      </ol>
      <div className="detail mw-pop" key={s.i} role="region" aria-live="polite" aria-label="Step detail">
        <h3>{s.i + 1}. {d.t}</h3>
        <div><p>{d.what}</p><p className="tech-line">{d.where}</p></div>
      </div>
    </div>
  );
}

/* ---------- which layers each kind of question touches ---------- */
const LAYERS = ["Page bundle", "/api/chat", "Answer cache", "Rate limit", "Groq LLM", "Pinecone"] as const;
type Layer = (typeof LAYERS)[number];
const PATHS: Array<{ id: string; label: string; hits: Layer[]; time: string; llm: number; pinecone: string; quota: string; note: string }> = [
  { id: "bubble", label: "Suggestion bubble", hits: ["Page bundle"], time: F.after.bubble, llm: 0, pinecone: "0", quota: "not used", note: "Answered when this version of the site was built and shipped in the page. No request at all." },
  { id: "repeat", label: "Repeated first question", hits: ["/api/chat", "Answer cache"], time: `${F.after.cacheHitLookup} lookup`, llm: 0, pinecone: "0", quota: "not used", note: "Someone already asked it since the last deploy: the stored answer comes back with its original trace, labelled as cached." },
  { id: "new", label: "New first question", hits: ["/api/chat", "Answer cache", "Rate limit", "Groq LLM", "Pinecone"], time: F.after.liveAnswer, llm: F.before.groqCalls, pinecone: "1–3 searches", quota: "1 question", note: "A cache miss runs the agent. If the answer is live, grounded, cited and found by a working meaning search, it is saved for the next visitor, after the response." },
  { id: "follow", label: "Follow-up", hits: ["/api/chat", "Rate limit", "Groq LLM", "Pinecone"], time: F.after.liveAnswer, llm: F.before.groqCalls, pinecone: "1–3 searches", quota: "1 question", note: "Its answer depends on the conversation, so it is never read from or written to the cache." },
];
function CachePaths() {
  const [id, setId] = useState(PATHS[0].id);
  const p = PATHS.find((x) => x.id === id)!;
  return (
    <div className="widget mw">
      <div className="chips" role="group" aria-label="Kind of question">
        {PATHS.map((x) => <button key={x.id} type="button" className="chip-btn" aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.label}</button>)}
      </div>
      <ol className="mw-layers" key={id} aria-label="Layers the request touches">
        {LAYERS.map((l) => {
          const n = p.hits.indexOf(l);
          return (
            <li key={l} className={n >= 0 ? "on" : "off"} style={n >= 0 ? { animationDelay: `${n * 0.18}s` } : undefined}>
              {l}<small>{n >= 0 ? "touched" : "skipped"}</small>
            </li>
          );
        })}
      </ol>
      <dl className="mw-readout" aria-live="polite" aria-label={`${p.label}: what it costs`}>
        <div><dt>Time</dt><dd>{p.time}</dd></div>
        <div><dt>LLM calls</dt><dd>{p.llm}</dd></div>
        <div><dt>Pinecone</dt><dd>{p.pinecone}</dd></div>
        <div><dt>Visitor&apos;s daily quota</dt><dd>{p.quota}</dd></div>
      </dl>
      <p className="mw-note">{p.note}</p>
    </div>
  );
}

/* ---------- three deploys and a rollback, before and after ---------- */
type Cell = { v: string; bad?: boolean };
type Row = { step: string; pages: string; answers: Cell; vectors: Cell };
const BEFORE: Row[] = [
  { step: "D1 live", pages: "content v1", answers: { v: "none, every answer live" }, vectors: { v: "production = v1" } },
  { step: "D2 published", pages: "content v2", answers: { v: "none, every answer live" }, vectors: { v: "production = v2" } },
  { step: "D3 building", pages: "content v2", answers: { v: "none, every answer live" }, vectors: { v: "production = v3 (synced before the build finished)", bad: true } },
  { step: "D3 published", pages: "content v3", answers: { v: "none, every answer live" }, vectors: { v: "production = v3" } },
  { step: "Roll back to D2", pages: "content v2", answers: { v: "none, every answer live" }, vectors: { v: "production = v3 (rollback doesn't rebuild)", bad: true } },
];
const AFTER: Row[] = [
  { step: "D1 live", pages: "content v1", answers: { v: "D1's bundle + D1's store" }, vectors: { v: "production-v1" } },
  { step: "D2 published", pages: "content v2", answers: { v: "D2's bundle + D2's store (empty at first)" }, vectors: { v: "production-v2" } },
  { step: "D3 building", pages: "content v2", answers: { v: "D2's bundle + D2's store" }, vectors: { v: "production-v2 (D3 fills production-v3 alongside)" } },
  { step: "D3 published", pages: "content v3", answers: { v: "D3's bundle + D3's store" }, vectors: { v: "production-v3" } },
  { step: "Roll back to D2", pages: "content v2", answers: { v: "D2's bundle + D2's store, as it was" }, vectors: { v: "production-v2 (kept: one of the 5 most recent)" } },
];
function DeployTimeline() {
  const [after, setAfter] = useState(true);
  const s = useStepper(AFTER.length, 3000);
  const r = (after ? AFTER : BEFORE)[s.i];
  const bad = r.answers.bad || r.vectors.bad;
  return (
    <div className="widget mw">
      <div className="mw-top">
        <div className="chips" role="group" aria-label="Which version of the system">
          <button type="button" className="chip-btn" aria-pressed={!after} onClick={() => setAfter(false)}>Before: one shared namespace</button>
          <button type="button" className="chip-btn" aria-pressed={after} onClick={() => setAfter(true)}>After: per deploy</button>
        </div>
        <PlayButton playing={s.playing} toggle={s.toggle} />
      </div>
      <ol className="mw-steps" aria-label="Timeline">
        {AFTER.map((x, n) => (
          <li key={x.step}>
            <button type="button" className="node" aria-pressed={n === s.i} onClick={() => s.set(n)}>{x.step}</button>
          </li>
        ))}
      </ol>
      <table className={`mw-table mw-pop${bad ? " mw-bad" : ""}`} key={`${after}-${s.i}`} aria-live="polite">
        <caption className="sr-only">What visitors get at “{r.step}”, {after ? "after" : "before"} the change</caption>
        <tbody>
          <tr><th scope="row">Pages visitors see</th><td>{r.pages}</td></tr>
          <tr><th scope="row">Cached answers</th><td className={r.answers.bad ? "bad" : undefined}>{r.answers.v}</td></tr>
          <tr><th scope="row">Vectors the chat searches</th><td className={r.vectors.bad ? "bad" : undefined}>{r.vectors.v}</td></tr>
        </tbody>
      </table>
      <p className="mw-note" aria-live="polite">{bad ? "Mismatch: the chat searches content these pages don't show." : "Everything the visitor gets comes from the same version."}</p>
    </div>
  );
}

export function MisoWidget({ name }: { name: string }) {
  switch (name) {
    case "miso-question-flow": return <QuestionFlow />;
    case "cache-paths": return <CachePaths />;
    case "deploy-timeline": return <DeployTimeline />;
    default: return null;
  }
}
