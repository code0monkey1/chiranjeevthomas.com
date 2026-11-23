"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SkillGroup } from "@/lib/content";

/** Each AI group shows its first few skills (the list is ordered by relevance); "Show all" reveals the rest and the full-stack groups. */
const PREVIEW = 4;

export function SkillsShowcase({ groups }: { groups: SkillGroup[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const shownGroups = groups.filter((g) => all || g.kind === "ai");
  const selected = shownGroups.flatMap((g) => g.items.map((i) => ({ ...i, kind: g.kind }))).find((i) => i.name === sel);
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
          <p>The AI toolkit I ship with. Select a skill to see where I’ve used it.</p>
        </div>
      </div>

      <p className="skills-core"><strong>Core stack</strong> React · Python · TypeScript · Node.js · FastAPI</p>

      <div ref={detailRef} className={`skill-detail${selected ? " on" : ""}`} role="status" aria-live="polite">
        {selected && (
          <div className="inner">
            <strong className="skill-detail-name">{selected.name}</strong>
            <span className="skill-detail-text">{selected.used}</span>
            {selected.link && <Link href={selected.link} className="btn primary">See the project</Link>}
          </div>
        )}
      </div>

      <div className="skill-grid">
        {shownGroups.map((g) => (
          <div key={g.title} className="skill-card lift">
            <h3>{g.title}</h3>
            <ul className="chips skill-chips">
              {(all ? g.items : g.items.slice(0, PREVIEW)).map((it) => (
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

      <div className="skills-more">
        <button type="button" className="chip-btn" aria-expanded={all} onClick={() => { setAll((a) => !a); setSel(null); }}>
          {all ? "Show fewer" : `Show all ${total} skills, including full-stack`}
        </button>
      </div>
    </>
  );
}
