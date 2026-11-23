"use client";
import { useEffect, useRef, useState } from "react";
import { ProjectCard, type CardProject } from "./ProjectCard";

const TABS: Array<[string, string]> = [["all", "All"], ["ai-engineering", "AI engineering"], ["full-stack", "Full-stack"], ["products", "Products"]];
/** Row sizes for `n` follower cards, using rows of 3, 2 or 1 and never leaving a gap. */
function splitRows(n: number): number[] {
  const rows: number[] = [];
  for (let left = n; left > 0; ) {
    const take = left === 4 ? 2 : Math.min(left, 3);
    rows.push(take);
    left -= take;
  }
  return rows;
}
const match = (p: CardProject, key: string) => (key === "all" ? true : key === "products" ? p.product : p.types.includes(key));

export function ProjectGrid({ projects }: { projects: CardProject[] }) {
  const [tab, setTab] = useState("all");
  const gridRef = useRef<HTMLDivElement>(null);
  // Diagram animations loop forever; pause each one while its card is off-screen to save CPU and battery.
  useEffect(() => {
    const media = gridRef.current?.querySelectorAll<HTMLElement>(".project-media");
    if (!media?.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.toggleAttribute("data-paused", !e.isIntersecting)),
      { rootMargin: "120px" },
    );
    media.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tab]);
  const shown = projects.filter((p) => match(p, tab));
  // The first project (lowest `order`, featured first) always leads in a wide slot, whatever the count.
  // The rest fill full rows so no slot is left empty: 3 → 3, 4 → 2+2, 5 → 3+2, 6 → 3+3.
  const hasLead = shown.length >= 3;
  const lead = hasLead ? shown[0] : undefined;
  const rest = hasLead ? shown.slice(1) : shown;
  const rows = splitRows(rest.length);
  return (
    <>
      <div className="section-head">
        <div>
          <h2 id="work-title">Projects</h2>
          <p>AI engineering and full-stack work, plus products I’ve shipped</p>
        </div>
        <div className="chips" role="group" aria-label="Filter projects">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" className="chip-btn" aria-pressed={tab === key} onClick={() => setTab(key)}>
              {label} ({projects.filter((p) => match(p, key)).length})
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">Showing {shown.length} {shown.length === 1 ? "project" : "projects"}</p>
      <div className="project-grid" ref={gridRef}>
        {lead && <ProjectCard p={lead} wide />}
        {(() => {
          let at = 0;
          return rows.map((n) => {
            const row = rest.slice(at, at + n);
            at += n;
            return (
              <div key={row[0].slug} className={`project-row r${n}`}>
                {row.map((p) => <ProjectCard key={p.slug} p={p} />)}
              </div>
            );
          });
        })()}
      </div>
    </>
  );
}
