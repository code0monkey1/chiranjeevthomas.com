"use client";
import Link from "next/link";
import { useState } from "react";

export type ListPost = { slug: string; title: string; description: string; date: string; tags: string[]; readingMinutes: number };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "ai-engineering", label: "AI engineering" },
  { id: "full-stack", label: "Full-stack" },
];

export function BlogList({ posts }: { posts: ListPost[] }) {
  const [f, setF] = useState("all");
  const shown = f === "all" ? posts : posts.filter((p) => p.tags.includes(f));
  return (
    <>
      <div className="chips" role="group" aria-label="Filter posts" style={{ margin: "28px 0 12px" }}>
        {FILTERS.map((x) => {
          const n = x.id === "all" ? posts.length : posts.filter((p) => p.tags.includes(x.id)).length;
          // An empty filter only leads to "No posts here yet", so leave it out.
          if (!n) return null;
          return (
            <button key={x.id} type="button" className="chip-btn" aria-pressed={f === x.id} onClick={() => setF(x.id)}>
              {x.label} ({n})
            </button>
          );
        })}
      </div>
      <ul className="post-list">
        {shown.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`}>
              <span className="date">{p.date}</span>
              <span className="t"><strong>{p.title}</strong><span>{p.description}</span><span className="kicker">{p.readingMinutes} min read</span></span>
            </Link>
          </li>
        ))}
        {!shown.length && <li style={{ padding: "24px 0", color: "var(--muted)" }}>No posts here yet.</li>}
      </ul>
    </>
  );
}
