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
  // Only the lead card carries the stack and every link; the others offer one action, and the case study has the rest.
  const demo = p.links.demo && (
    <a key="demo" href={p.links.demo} className="btn" target="_blank" rel="noopener">Live demo<span className="sr-only"> (opens in new tab)</span></a>
  );
  const code = p.links.github && (
    <a key="code" href={p.links.github} className="btn" target="_blank" rel="noopener">GitHub<span className="sr-only"> (opens in new tab)</span></a>
  );
  const actions = wide
    ? [how && <Link key="how" href={how} className="btn primary">How it works</Link>, demo, code]
    : [how ? <Link key="how" href={how} className="btn primary">How it works</Link> : demo || code];
  return (
    <article className={`project-card lift${wide ? " wide" : ""}`}>
      {media && (
        <div className="project-media">
          {media}
          <span className="status-pill">{p.status}</span>
        </div>
      )}
      <div className="project-body">
        {!media && <span className="status-badge">{p.status}</span>}
        <h3>{how ? <Link href={how}>{p.title}</Link> : p.title}</h3>
        <p>{p.summary}</p>
        {wide && (
          <ul className="tech-list" aria-label="Tech stack">
            {p.stack.map((s) => <li key={s} className="tech">{s}</li>)}
          </ul>
        )}
        {actions.some(Boolean) && <div className="project-actions">{actions}</div>}
        {notes.length > 0 && <p className="project-note">{notes.join(" · ")}</p>}
      </div>
    </article>
  );
}
