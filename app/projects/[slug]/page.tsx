import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects, getProject, getPosts, tags } from "@/lib/content";
import { renderMarkdown, splitWidgets } from "@/lib/markdown";
import { Widget } from "@/components/widgets/Widgets";
import { DemoVideo } from "@/components/DemoVideo";
import { JsonLd, projectLd, breadcrumbLd } from "@/components/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() {
  return getProjects().filter((p) => p.caseStudy).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProject((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.description, url: `/projects/${p.slug}` },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProject((await params).slug);
  if (!p || !p.caseStudy) notFound();
  const parts = splitWidgets(await renderMarkdown(p.body));
  const all = getProjects().filter((x) => x.caseStudy);
  const next = all[(all.findIndex((x) => x.slug === p.slug) + 1) % all.length];
  const posts = getPosts().filter((post) => post.project === p.slug);

  return (
    <article className="wrap" style={{ paddingBottom: 96 }}>
      <header className="page-head">
        <Link href="/#work" className="back">← All projects</Link>
        <ul className="tech-list" aria-label="Tags">
          <li className="badge" style={{ background: "var(--green-soft)", color: "var(--green)" }}>{p.status}</li>
          {p.allTags.map((t) => (
            <li key={t}><Link href={`/projects/tag/${t}`} className={`badge ${tags[t].type ? `badge-${t}` : "badge-tag"}`}>{tags[t].label}</Link></li>
          ))}
        </ul>
        <h1>{p.headline}</h1>
        <div className="chips">
          {p.links.demo && <a className="btn lg primary" href={p.links.demo} target="_blank" rel="noopener">Try the live demo</a>}
          {p.links.github && <a className="btn lg" href={p.links.github} target="_blank" rel="noopener">View the code</a>}
        </div>
        <ul className="tech-list" aria-label="Tech stack">{p.stack.map((s) => <li key={s} className="tech">{s}</li>)}</ul>
      </header>

      {p.media && (
        <figure className="media-hero">
          <DemoVideo src={p.media.video} poster={p.media.poster} alt={p.media.alt} controls />
          <figcaption className="kicker" style={{ marginTop: 10 }}>The live app in action.</figcaption>
        </figure>
      )}

      <div className="prose" style={{ marginTop: 40, maxWidth: 960 }}>
        {parts.map((part, i) => ("widget" in part ? <Widget key={i} name={part.widget} /> : <div key={i} dangerouslySetInnerHTML={{ __html: part.html }} />))}
      </div>

      {posts.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 22 }}>Related writing</h2>
          <ul>{posts.map((post) => <li key={post.slug}><Link href={`/blog/${post.slug}`}>{post.title}</Link></li>)}</ul>
        </section>
      )}

      <nav aria-label="More projects" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, borderTop: "1px solid var(--line)", marginTop: 48, paddingTop: 24 }}>
        <Link href="/#work" style={{ textDecoration: "none", fontWeight: 500 }}>← Back to all projects</Link>
        {next && next.slug !== p.slug && <Link href={`/projects/${next.slug}`} style={{ textDecoration: "none", fontWeight: 500 }}>Next: {next.title.split(" — ")[0]} →</Link>}
      </nav>
      <JsonLd data={projectLd(p)} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Projects", path: "/#work" }, { name: p.title, path: `/projects/${p.slug}` }])} />
    </article>
  );
}
