import { site, type Post, type Project } from "@/lib/content";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const personLd = () => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${site.url}/#person`,
  name: site.name,
  url: site.url,
  image: `${site.url}${site.photo.src}`,
  jobTitle: site.jobTitle,
  email: `mailto:${site.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressCountry: "IN" },
  knowsAbout: site.knowsAbout,
  sameAs: [site.socials.github, site.socials.linkedin, site.socials.medium].filter(Boolean),
});

export const postLd = (p: Post) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: p.title,
  description: p.description,
  datePublished: p.date.toISOString(),
  dateModified: (p.updated ?? p.date).toISOString(),
  url: `${site.url}/blog/${p.slug}`,
  mainEntityOfPage: `${site.url}/blog/${p.slug}`,
  author: { "@id": `${site.url}/#person`, "@type": "Person", name: site.name, url: site.url },
  image: `${site.url}/blog/${p.slug}/opengraph-image`,
  keywords: p.tags.join(", "),
});

export const projectLd = (p: Project) => ({
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: p.title,
  headline: p.headline,
  description: p.description,
  url: `${site.url}/projects/${p.slug}`,
  creator: { "@id": `${site.url}/#person`, "@type": "Person", name: site.name },
  keywords: p.stack.join(", "),
  ...(p.links.github ? { codeRepository: p.links.github } : {}),
});

export const breadcrumbLd = (items: Array<{ name: string; path: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${site.url}${it.path}` })),
});
