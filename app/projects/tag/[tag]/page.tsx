import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts, getProjects, site, tags, usedTags } from "@/lib/content";
import { ProjectCard } from "@/components/ProjectCard";

export const dynamicParams = false;
export function generateStaticParams() {
  return usedTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const t = tags[(await params).tag];
  if (!t) return {};
  const title = `${t.label} projects`;
  return { title, description: `${t.description} Projects and writing by ${site.name}.`, alternates: { canonical: `/projects/tag/${t.slug}` } };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const slug = (await params).tag;
  const t = tags[slug];
  if (!t) notFound();
  const projects = getProjects().filter((p) => p.allTags.includes(slug));
  const posts = getPosts().filter((p) => p.tags.includes(slug));
  return (
    <div className="wrap" style={{ paddingBottom: 96 }}>
      <header className="page-head">
        <Link href="/#work" className="back">← All projects</Link>
        <h1>{t.label} projects</h1>
        <p className="lede">{t.description} Built by {site.name}, {site.jobTitle.toLowerCase()}.</p>
      </header>
      <div className="project-grid" style={{ marginTop: 32 }}>
        {projects.map((p) => (
          <ProjectCard key={p.slug} p={{ slug: p.slug, title: p.title, summary: p.summary, status: p.status, types: p.types, product: p.product, caseStudy: p.caseStudy, stack: p.stack, links: p.links, media: p.media }} />
        ))}
      </div>
      {posts.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 28 }}>Writing on {t.label}</h2>
          <ul className="post-list">{posts.map((p) => <li key={p.slug}><Link href={`/blog/${p.slug}`}><span className="t"><strong>{p.title}</strong><span>{p.description}</span></span></Link></li>)}</ul>
        </section>
      )}
    </div>
  );
}
