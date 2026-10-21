import type { Metadata } from "next";
import { formatDate, getPosts, site } from "@/lib/content";
import { BlogList } from "@/components/BlogList";

export const metadata: Metadata = {
  title: "Writing on AI engineering",
  description: `Notes from building agentic applications, RAG pipelines and LLM features in production, by ${site.name}.`,
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getPosts().map((p) => ({ slug: p.slug, title: p.title, description: p.description, date: formatDate(p.date), tags: p.tags, readingMinutes: p.readingMinutes }));
  return (
    <div className="wrap" style={{ paddingBottom: 96 }}>
      <header className="page-head">
        <h1>Writing</h1>
        <p className="lede">Notes from building agents, RAG pipelines and LLM features that hold up in production.</p>
      </header>
      <BlogList posts={posts} />
    </div>
  );
}
