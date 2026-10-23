"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SkillGroup } from "@/lib/content";

const KIND_LABEL = { ai: "AI engineering", fullstack: "Full-stack" } as const;
const KIND_BADGE = { ai: "badge badge-ai-engineering", fullstack: "badge badge-full-stack" } as const;

export function SkillsShowcase({ groups }: { groups: SkillGroup[] }) {
  const [tab, setTab] = useState<"all" | "ai" | "fullstack">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const count = (k: string) => groups.filter((g) => k === "all" || g.kind === k).reduce((n, g) => n + g.items.length, 0);
  const selected = groups.flatMap((g) => g.items.map((i) => ({ ...i, kind: g.kind }))).find((i) => i.name === sel);
  let idx = 0;
  // On phones the panel can sit screens above the tapped chip; bring it into view.
  useEffect(() => {
    if (sel) detailRef.current?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  return (
    <>
      <div className="section-head">
        <div>
          <h2 id="skills-title">Skills</h2>
          <p>The AI and full-stack toolkit I ship with. Click any skill to see where I’ve used it.</p>
        </div>
        <div className="chips" role="group" aria-label="Filter skills">
          {(["all", "ai", "fullstack"] as const).map((k) => (
            <button key={k} type="button" className="chip-btn" aria-pressed={tab === k} onClick={() => { setTab(k); setRev((r) => r + 1); }}>
              {k === "all" ? "All" : KIND_LABEL[k]} ({count(k)})
            </button>
          ))}
        </div>
      </div>

      <div ref={detailRef} className={`skill-detail${selected ? " on" : ""}`} role="status" aria-live="polite">
        {selected && (
          <div className="inner">
            <strong style={{ fontSize: 18 }}>{selected.name}</strong>
            <span className={KIND_BADGE[selected.kind]}>{KIND_LABEL[selected.kind]}</span>
            <span style={{ flex: "1 1 320px", fontSize: 15, lineHeight: 1.55, color: "var(--ink-3)" }}>{selected.used}</span>
            {selected.link && <Link href={selected.link} className="btn primary">See the project</Link>}
          </div>
        )}
      </div>

      <div className="skill-grid">
        {groups.filter((g) => tab === "all" || g.kind === tab).map((g) => (
          <div key={`${g.title}-${rev}`} className="skill-card lift">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3>{g.title}</h3>
              <span className={KIND_BADGE[g.kind]}>{KIND_LABEL[g.kind]}</span>
            </div>
            <ul className="chips" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {g.items.map((it) => (
                <li key={it.name}>
                  <button type="button" className={`skill-chip ${g.kind === "ai" ? "ai" : "fs"}`} style={{ animationDelay: `${(idx++ * 0.025).toFixed(3)}s` }} aria-pressed={sel === it.name} onClick={() => setSel(sel === it.name ? null : it.name)}>
                    <span className={`dot ${g.kind === "ai" ? "ai" : "fs"}`} aria-hidden="true" />{it.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
