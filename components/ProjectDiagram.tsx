/**
 * Small animated how-it-works diagrams for project cards that have no demo video.
 * Each one shows the project's core idea in one glance; the examples are illustrative.
 */

function GrabbitSearch() {
  return (
    <div className="pd pd-search" role="img" aria-label="A shopper's sentence is turned by an LLM into a validated Elasticsearch query, which returns matching products">
      <div className="pd-say pd-step" style={{ animationDelay: "0s" }}>“spicy veg snacks under ₹200”</div>
      <div className="pd-row">
        <span className="pd-node pd-step" style={{ animationDelay: ".5s" }}>LLM</span>
        <span className="pd-arrow pd-step" style={{ animationDelay: ".7s" }} />
        <code className="pd-json pd-step" style={{ animationDelay: ".9s" }}>
          {"{ diet: \"veg\","}<br />
          {"  tags: [\"spicy\"],"}<br />
          {"  price: { lte: 200 } }"}
          <span className="pd-ok">✓ schema checked</span>
        </code>
      </div>
      <div className="pd-row">
        <span className="pd-node pd-step" style={{ animationDelay: "1.5s" }}>Elasticsearch</span>
        <span className="pd-arrow pd-step" style={{ animationDelay: "1.7s" }} />
        <span className="pd-results">
          {[0, 1, 2].map((i) => <span key={i} className="pd-result pd-step" style={{ animationDelay: `${1.9 + i * 0.15}s` }} />)}
        </span>
      </div>
    </div>
  );
}

function AgentTrace() {
  const steps: Array<[string, number, number]> = [["prompt (level 2 tone)", 0, 20], ["calculate_late_fees", 20, 18], ["draft_formal_demand_letter", 38, 36], ["human approval", 74, 26]];
  return (
    <div className="pd pd-trace" role="img" aria-label="A trace of one agent run, step by step, followed by golden-set eval checks on tone, tool choice and approval">
      <div className="pd-trace-head">run #2043 · level 2 dispute</div>
      {steps.map(([name, start, width], i) => (
        <div key={name} className="pd-span">
          <span className="pd-span-name">{name}</span>
          <span className="pd-span-track"><span className="pd-span-bar pd-grow" style={{ left: `${start}%`, width: `${width}%`, animationDelay: `${i * 0.45}s` }} /></span>
        </div>
      ))}
      <div className="pd-evals">
        {["tone", "tools", "approval"].map((c, i) => <span key={c} className="pd-check pd-step" style={{ animationDelay: `${2 + i * 0.25}s` }}>✓ {c}</span>)}
      </div>
    </div>
  );
}

function ReferralFlow() {
  const stages: Array<[string, string]> = [["Upskill", "grow the skills roles ask for"], ["Connect", "with engineers at top tech companies"], ["Get referred", "to roles there"]];
  return (
    <div className="pd pd-flow" role="img" aria-label="DevReferral's flow: developers upskill, connect with engineers at top tech companies, and get referred to roles there">
      <div className="pd-flow-row">
        {stages.map(([t, s], i) => (
          <div key={t} className="pd-stage pd-step" style={{ animationDelay: `${i * 0.5}s` }}>
            <b>{t}</b>
            <small>{s}</small>
          </div>
        ))}
      </div>
      <div className="pd-stats">
        {["0 → 1 as founding engineer", "20+ features", "+30% users"].map((s, i) => <span key={s} className="pd-stat pd-step" style={{ animationDelay: `${1.6 + i * 0.2}s` }}>{s}</span>)}
      </div>
    </div>
  );
}

function MisoChat() {
  const lanes: Array<[string, string]> = [["meaning", "Pinecone"], ["keywords", "BM25"]];
  return (
    <div className="pd pd-miso" role="img" aria-label="Miso, the chat on this site: a question triggers a search that runs meaning and keyword search, merges the two rankings into the top 4 passages, and returns an answer that cites its source, here served from the cache in 60 milliseconds">
      <div className="pd-say pd-step" style={{ animationDelay: "0s" }}>“How does Miso cache answers?”</div>
      <div className="pd-row">
        <span className="pd-node pd-step" style={{ animationDelay: ".5s" }}>search_portfolio</span>
        <span className="pd-arrow pd-step" style={{ animationDelay: ".7s" }} />
        <span className="pd-lanes">
          {lanes.map(([kind, engine], i) => (
            <span key={kind} className="pd-lane">
              <span className="pd-lane-name pd-step" style={{ animationDelay: `${0.8 + i * 0.2}s` }}>{kind} <small>· {engine}</small></span>
              <span className="pd-span-track"><span className="pd-span-bar pd-grow" style={{ left: 0, width: "100%", animationDelay: `${0.9 + i * 0.25}s` }} /></span>
            </span>
          ))}
        </span>
        <span className="pd-arrow pd-step" style={{ animationDelay: "1.6s" }} />
        <span className="pd-fuse pd-step" style={{ animationDelay: "1.8s" }}>RRF top 4</span>
      </div>
      <div className="pd-answer pd-step" style={{ animationDelay: "2.4s" }}>
        <span className="pd-answer-long">Bubbles ship pre-answered; repeats come from a per-deploy cache.</span>
        <span className="pd-answer-short">Repeats come from a per-deploy cache.</span>
        <span className="pd-chips">
          <span className="pd-source">↗ Miso: caching</span>
          <span className="pd-check pd-step" style={{ animationDelay: "2.9s" }}>cache hit · 60 ms</span>
        </span>
      </div>
    </div>
  );
}

const DIAGRAMS: Record<string, () => React.ReactElement> = {
  "miso-chat": MisoChat,
  "grabbit-llm-search": GrabbitSearch,
  "agent-observability": AgentTrace,
  devreferral: ReferralFlow,
};

export const hasDiagram = (slug: string) => slug in DIAGRAMS;

export function ProjectDiagram({ slug }: { slug: string }) {
  const D = DIAGRAMS[slug];
  return D ? <D /> : null;
}
