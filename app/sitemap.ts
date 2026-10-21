import type { MetadataRoute } from "next";
import { getPosts, getProjects, site, usedTags } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${site.url}${p}`;
  const posts = getPosts();
  const latest = posts[0]?.date ?? new Date();
  return [
    { url: u("/"), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: u("/blog"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    ...getProjects().filter((p) => p.caseStudy).map((p) => ({ url: u(`/projects/${p.slug}`), lastModified: p.date, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...posts.map((p) => ({ url: u(`/blog/${p.slug}`), lastModified: p.updated ?? p.date, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...usedTags().map((t) => ({ url: u(`/projects/tag/${t}`), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
