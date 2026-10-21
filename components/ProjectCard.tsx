import Link from "next/link";
import { PlayIcon } from "./Icons";
import { DemoVideo } from "./DemoVideo";

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

function Action({ href, label, note, primary, internal }: { href?: string; label: string; note?: string; primary?: boolean; internal?: boolean }) {
  if (!href) {
    return (
      <span className="btn disabled" aria-disabled="true" title={note || "unavailable"}>
        {label} <small>{note || "unavailable"}</small>
      </span>
    );
  }
  if (internal) return <Link href={href} className={`btn${primary ? " primary" : ""}`}>{label}</Link>;
  return <a href={href} className={`btn${primary ? " primary" : ""}`} target="_blank" rel="noopener">{label}</a>;
}

export function ProjectCard({ p }: { p: CardProject }) {
  const how = p.caseStudy ? `/projects/${p.slug}` : undefined;
  return (
    <article className="project-card lift">
      <div className="project-media">
        {p.media ? (
          <DemoVideo src={p.media.video} poster={p.media.poster} alt={p.media.alt} />
        ) : (
          <div className="placeholder" aria-hidden="true"><span className="play"><PlayIcon /></span>Demo coming soon</div>
        )}
        <span className="status-pill">{p.status}</span>
      </div>
      <div className="project-body">
        <ul className="tech-list" aria-label="Project type">
          {p.product && <li className="badge badge-product">Product</li>}
          {p.types.map((t) => <li key={t} className={`badge badge-${t}`}>{TYPE_LABEL[t] ?? t}</li>)}
        </ul>
        <h3>{how ? <Link href={how}>{p.title}</Link> : p.title}</h3>
        <p>{p.summary}</p>
        <ul className="tech-list" aria-label="Tech stack">
          {p.stack.map((s) => <li key={s} className="tech">{s}</li>)}
        </ul>
        <div className="project-actions">
          <Action href={how} label="How it works" note={p.links.howNote || "coming soon"} primary internal />
          <Action href={p.links.demo} label="Live demo" note={p.links.demoNote} />
          <Action href={p.links.github} label="GitHub" note={p.links.githubNote} />
        </div>
      </div>
    </article>
  );
}
