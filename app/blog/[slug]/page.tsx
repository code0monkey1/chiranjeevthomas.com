import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getPost, getPosts, getProject, site, tags } from "@/lib/content";
import { headings, renderMarkdown } from "@/lib/markdown";
import { JsonLd, breadcrumbLd, postLd } from "@/components/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.description, url: `/blog/${p.slug}`, publishedTime: p.date.toISOString(), authors: [site.name], tags: p.tags.map((t) => tags[t].label) },
    twitter: { card: "summary_large_image", title: p.title, description: p.description },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  const html = await renderMarkdown(p.body);
  const toc = headings(html);
  const project = p.project ? getProject(p.project) : undefined;
  return (
    <article className="wrap article" style={{ paddingBottom: 96 }}>
      <header className="page-head" style={{ maxWidth: 820 }}>
        <Link href="/blog" className="back">← All writing</Link>
        <div className="meta-row">
          <time dateTime={p.date.toISOString()}>{formatDate(p.date)}</time><span>·</span><span>{p.readingMinutes} min read</span>
        </div>
        <h1>{p.title}</h1>
        <p className="lede">{p.description}</p>
        <ul className="tech-list" aria-label="Tags">
          {p.tags.map((t) => <li key={t}><Link href={`/projects/tag/${t}`} className={`badge ${tags[t].type ? `badge-${t}` : "badge-tag"}`}>{tags[t].label}</Link></li>)}
        </ul>
      </header>
      <div className="article-layout" style={{ marginTop: 40 }}>
        <div className="article-main">
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          {project && (
            <p style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
              This post comes from <Link href={project.caseStudy ? `/projects/${project.slug}` : "/#work"}>{project.title}</Link>.
            </p>
          )}
        </div>
        {toc.length > 1 && (
          <nav className="toc" aria-label="On this page">
            <span className="kicker">On this page</span>
            {toc.map((h) => <a key={h.id} href={`#${h.id}`}>{h.text}</a>)}
          </nav>
        )}
      </div>
      <JsonLd data={postLd(p)} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Writing", path: "/blog" }, { name: p.title, path: `/blog/${p.slug}` }])} />
    </article>
  );
}
