"use client";
import { useState } from "react";

/* ---------- generic clickable pipeline ---------- */
type Stage = { label: string; what: string; tech: string };
function Pipeline({ lanes, stages, initial }: { lanes: Array<{ name?: string; ids: string[] }>; stages: Record<string, Stage>; initial: string }) {
  const [sel, setSel] = useState(initial);
  const d = stages[sel];
  return (
    <div className="widget">
      <span className="kicker">Click any stage to see what happens there.</span>
      {lanes.map((lane, li) => (
        <div key={li} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lane.name && <span className="lane-label">{lane.name}</span>}
          <ol className="node-row">
            {lane.ids.map((id, i) => (
              <li key={id}>
                <button type="button" className="node" aria-pressed={sel === id} onClick={() => setSel(id)}>{stages[id].label}</button>
                {i < lane.ids.length - 1 && <span className="arrow" aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <div className="detail" role="region" aria-live="polite" aria-label="Stage detail">
        <h3>{d.label}</h3>
        <div><p>{d.what}</p><p className="tech-line">{d.tech}</p></div>
      </div>
    </div>
  );
}

/* ---------- InvoiceChaser ---------- */
const LEVEL_TOOLS: Array<[string, number]> = [
  ["check_invoice_status", 1], ["draft_polite_reminder", 1], ["escalate_dispute", 1],
  ["draft_formal_demand_letter", 2], ["calculate_late_fees", 2],
  ["draft_final_notice", 3], ["lookup_small_claims_procedures", 3], ["generate_court_filing_guide", 3],
];
const TONES = { 1: "Friendly — warm reminder", 2: "Formal — firm, cites terms", 3: "Legal — final notice, court prep" } as const;

function ToolGating() {
  const [lvl, setLvl] = useState<1 | 2 | 3>(1);
  return (
    <div className="widget">
      <div className="chips" role="group" aria-label="Escalation level">
        {([1, 2, 3] as const).map((n) => (
          <button key={n} type="button" className="chip-btn" aria-pressed={lvl === n} onClick={() => setLvl(n)}>
            Level {n} · {["Friendly", "Formal", "Legal"][n - 1]}
          </button>
        ))}
      </div>
      <p style={{ margin: 0 }}>Tone: <strong>{TONES[lvl]}</strong></p>
      <ul className="tool-grid" aria-label="Tools by level">
        {LEVEL_TOOLS.map(([name, need]) => (
          <li key={name} className={`tool ${need <= lvl ? "on" : "off"}`}>
            {name}<small>{need <= lvl ? "available" : "hidden from model"}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Approval() {
  const [d, setD] = useState<null | "approve" | "edit" | "reject">(null);
  const out = { approve: "Approved — the run resumes and records the letter as sent.", edit: "Edited — your changes replace the draft, then the run resumes.", reject: "Rejected — nothing is sent; the agent asks how to proceed." };
  return (
    <div className="widget">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }} className="kicker">
        <span>draft_formal_demand_letter</span><span>Level 2 · Formal</span>
      </div>
      <div className="draft-card">Payment of the outstanding invoice, plus the late fee set in your terms, is now requested within the agreed period. [Sample draft — illustrative]</div>
      {d ? (
        <div className="outcome" role="status"><span>{out[d]}</span><button type="button" className="chip-btn" onClick={() => setD(null)}>Reset</button></div>
      ) : (
        <div className="decide">
          <button type="button" className="primary" onClick={() => setD("approve")}>Approve</button>
          <button type="button" onClick={() => setD("edit")}>Edit</button>
          <button type="button" onClick={() => setD("reject")}>Reject</button>
        </div>
      )}
    </div>
  );
}

const INVOICE_STAGES: Record<string, Stage> = {
  ui: { label: "React dashboard", what: "Invoice table, chat panel, escalation badge and the approval card that surfaces each interrupt.", tech: "React 19 · Vite · Tailwind v4 · Lucide" },
  api: { label: "FastAPI", what: "Chat, invoice creation and listing, and a resume endpoint that continues a paused run with the human decision.", tech: "POST /api/chat · POST /api/invoices · POST /api/invoices/{id}/resume · GET /api/invoices" },
  agent: { label: "LangChain agent + middleware", what: "Dynamic prompt sets tone per level, tool gating filters what the model sees, HITL middleware interrupts on draft tools.", tech: "@dynamic_prompt · @wrap_model_call · HumanInTheLoopMiddleware · context_schema" },
  llm: { label: "Llama 3.3 70B on Groq", what: "Fast, low-cost inference with strong enough reasoning for multi-step tool use.", tech: "Groq API" },
  mcp: { label: "FastMCP invoice server", what: "Invoice data is exposed as MCP tools, so a real accounting system can replace the mock later.", tech: "src/mcp_server/invoice_server.py" },
  tavily: { label: "Tavily search", what: "At Level 3 the agent researches small-claims procedures on the web.", tech: "Tavily API" },
  state: { label: "Typed agent state", what: "Escalation level and invoice details live in a typed state schema; tools change it through Command updates.", tech: "InvoiceDisputeState(AgentState) · Command(update=…)" },
  ckpt: { label: "Checkpointer", what: "Each invoice is its own thread, so an interrupted run can be resumed later.", tech: "LangGraph checkpointer · thread invoice-{id}" },
};

/* ---------- Grabbit search ---------- */
const EXAMPLES = [
  { label: "Snacks for a party", q: "cheap snacks for a party of 10, nothing spicy", intent: "category: snacks · price: low · exclude: spicy · prefer bulk packs",
    dsl: '{\n  "query": { "bool": {\n    "must":     [{ "match": { "category": "snacks" } }],\n    "must_not": [{ "match": { "tags": "spicy" } }],\n    "should":   [{ "match": { "pack": "party" } }]\n  }},\n  "sort": [{ "price": "asc" }]\n}' },
  { label: "Breakfast under ₹200", q: "something healthy for breakfast under 200 rupees", intent: "category: breakfast · tag: healthy · price ≤ 200",
    dsl: '{\n  "query": { "bool": {\n    "must":   [{ "match": { "category": "breakfast" } }],\n    "should": [{ "match": { "tags": "healthy" } }],\n    "filter": [{ "range": { "price": { "lte": 200 } } }]\n  }}\n}' },
  { label: "Vague request", q: "that green tea brand in the yellow box", intent: "product: green tea · fuzzy description · rank by relevance",
    dsl: '{\n  "query": { "bool": {\n    "must":   [{ "match": { "name": { "query": "green tea", "fuzziness": "AUTO" } } }],\n    "should": [{ "match": { "description": "yellow box" } }]\n  }}\n}' },
];
function SearchExamples() {
  const [i, setI] = useState(0);
  const e = EXAMPLES[i];
  return (
    <div className="widget">
      <div className="chips" role="group" aria-label="Example searches">
        {EXAMPLES.map((x, n) => <button key={x.label} type="button" className="chip-btn" aria-pressed={n === i} onClick={() => setI(n)}>{x.label}</button>)}
      </div>
      <div className="ex-row">
        <div className="ex-in">
          <span className="kicker">Shopper types</span>
          <p className="q">“{e.q}”</p>
          <span className="kicker" style={{ marginTop: "auto" }}>LLM extracts</span>
          <p style={{ margin: 0, color: "var(--ink-3)" }}>{e.intent}</p>
        </div>
        <div className="ex-out"><span className="kicker" style={{ color: "#a6a9b0" }}>Generated Elasticsearch query</span><pre>{e.dsl}</pre></div>
      </div>
    </div>
  );
}
const SEARCH_STAGES: Record<string, Stage> = {
  app: { label: "Shopper’s request", what: "A free-text request from the React Native app or web portal.", tech: "React Native · React" },
  api: { label: "Search API", what: "The backend receives the request and decides whether it needs the LLM path.", tech: "Spring Boot on AWS" },
  llm: { label: "LLM → structured query", what: "The LLM reads the request and produces a structured Elasticsearch query instead of free text.", tech: "[Model / provider] · prompt with field schema" },
  guard: { label: "Validate", what: "The generated query is checked before it runs, so a bad generation never hits the index.", tech: "[Your validation: schema, allow-listed fields, fallback]" },
  es: { label: "Elasticsearch", what: "The validated query runs against the product catalogue.", tech: "Elasticsearch" },
  res: { label: "Results", what: "Ranked products come back to the app like any other search.", tech: "Same results UI as keyword search" },
};

/* ---------- RAG ---------- */
const RAG_STAGES: Record<string, Stage> = {
  load: { label: "Upload & parse", what: "A PDF or text file is uploaded from the chat UI and parsed to text, keeping its source for display later.", tech: "POST /api/ingest · Multer (≈10 MB cap) · LangChain PDFLoader" },
  chunk: { label: "Chunk", what: "Text is split into overlapping chunks small enough to retrieve precisely.", tech: "RecursiveCharacterTextSplitter · 500 chars / 100 overlap" },
  embed: { label: "Embed", what: "Pinecone embeds each chunk itself, so there is no separate embedding service.", tech: "Pinecone integrated embeddings · llama-text-embed-v2 · 1024-d" },
  store: { label: "Index in Pinecone", what: "Chunks are upserted to a serverless index with cosine similarity.", tech: "rag-embedded-index · AWS us-east-1" },
  ask: { label: "User question", what: "The question arrives with a session id, so follow-up questions keep their context.", tech: "POST /api/chat · session memory" },
  retrieve: { label: "LLM calls rag_search", what: "The model decides whether the question needs the documents. If so, it calls the retrieval tool, which pulls the 6 most similar chunks.", tech: "Tool calling · Pinecone semantic search · topK 6" },
  rerank: { label: "Rerank to top 3", what: "A cross-encoder reranker re-scores the 6 candidates and keeps the best 3 for the prompt.", tech: "bge-reranker-v2-m3 · topN 3 · ~200 ms search + rerank" },
  generate: { label: "Generate with Groq", what: "The LLM writes the answer from the reranked context.", tech: "Llama 3.3 70B on Groq · ~1–3 s" },
  cite: { label: "Answer + sources", what: "The response carries which tools ran and the passages used, and the UI shows them next to the answer.", tech: "toolsUsed · context → UI" },
};

export function Widget({ name }: { name: string }) {
  switch (name) {
    case "tool-gating": return <ToolGating />;
    case "approval": return <Approval />;
    case "invoice-architecture": return <Pipeline initial="agent" stages={INVOICE_STAGES} lanes={[{ name: "Request path", ids: ["ui", "api", "agent", "llm"] }, { name: "Tools & state", ids: ["mcp", "tavily", "state", "ckpt"] }]} />;
    case "search-examples": return <SearchExamples />;
    case "search-pipeline": return <Pipeline initial="llm" stages={SEARCH_STAGES} lanes={[{ ids: ["app", "api", "llm", "guard", "es", "res"] }]} />;
    case "rag-pipeline": return <Pipeline initial="retrieve" stages={RAG_STAGES} lanes={[{ name: "Ingestion (offline)", ids: ["load", "chunk", "embed", "store"] }, { name: "Query (per request)", ids: ["ask", "retrieve", "rerank", "generate", "cite"] }]} />;
    default: return null;
  }
}
