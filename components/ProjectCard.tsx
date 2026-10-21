import Link from "next/link";
import { DemoVideo } from "./DemoVideo";
import { ProjectDiagram, hasDiagram } from "./ProjectDiagram";

export type CardProject = {
  slug: string;
  title: string;
  summary: string;
  status: string;
  types: string[];
  product: boolean;
  caseStudy: boolean;
  stack: string[];
  links: { demo?: string; github?: string; howNote?: string; demoNote?: string; githubNote?: string };
  media?: { video: string; poster: string; alt: string };
};

const TYPE_LABEL: Record<string, string> = { "ai-engineering": "AI engineering", "full-stack": "Full-stack" };

/** Notes explain a missing link ("code is private"); "coming soon" says nothing useful, so it's dropped. */
const note = (label: string, text?: string) => (text && !/coming soon/i.test(text) ? `${label} ${text}` : null);

export function ProjectCard({ p, wide = false }: { p: CardProject; wide?: boolean }) {
  const how = p.caseStudy ? `/projects/${p.slug}` : undefined;
  const notes = [!p.links.demo && note("Demo:", p.links.demoNote), !p.links.github && note("Code:", p.links.githubNote)].filter(Boolean);
  const media = p.media ? (
    <DemoVideo src={p.media.video} poster={p.media.poster} alt={p.media.alt} />
  ) : hasDiagram(p.slug) ? (
    <ProjectDiagram slug={p.slug} />
  ) : null;
  return (
    <article className={`project-card lift${wide ? " wide" : ""}`}>
      {media && (
        <div className="project-media">
          {media}
          <span className="status-pill">{p.status}</span>
        </div>
      )}
      <div className="project-body">
        <ul className="tech-list" aria-label="Project type">
          {!media && <li className="badge">{p.status}</li>}
          {p.product && <li className="badge badge-product">Product</li>}
          {p.types.map((t) => <li key={t} className={`badge badge-${t}`}>{TYPE_LABEL[t] ?? t}</li>)}
        </ul>
        <h3>{how ? <Link href={how}>{p.title}</Link> : p.title}</h3>
        <p>{p.summary}</p>
        <ul className="tech-list" aria-label="Tech stack">
          {p.stack.map((s) => <li key={s} className="tech">{s}</li>)}
        </ul>
        <div className="project-actions">
          {how && <Link href={how} className="btn primary">How it works</Link>}
          {p.links.demo && <a href={p.links.demo} className="btn" target="_blank" rel="noopener">Live demo</a>}
          {p.links.github && <a href={p.links.github} className="btn" target="_blank" rel="noopener">GitHub</a>}
        </div>
        {notes.length > 0 && <p className="project-note">{notes.join(" · ")}</p>}
      </div>
    </article>
  );
}
