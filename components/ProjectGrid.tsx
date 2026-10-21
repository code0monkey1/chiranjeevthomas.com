"use client";
import { useState } from "react";
import { ProjectCard, type CardProject } from "./ProjectCard";

const TABS: Array<[string, string]> = [["all", "All"], ["ai-engineering", "AI engineering"], ["full-stack", "Full-stack"], ["products", "Products"]];
const match = (p: CardProject, key: string) => (key === "all" ? true : key === "products" ? p.product : p.types.includes(key));

export function ProjectGrid({ projects }: { projects: CardProject[] }) {
  const [tab, setTab] = useState("all");
  const shown = projects.filter((p) => match(p, tab));
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
      <div className="project-grid">
        {shown.map((p) => <ProjectCard key={p.slug} p={p} />)}
      </div>
    </>
  );
}
