import { getPosts, site } from "@/lib/content";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const items = getPosts()
    .map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${site.url}/blog/${p.slug}</link>
      <guid isPermaLink="true">${site.url}/blog/${p.slug}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} — Writing</title>
    <link>${site.url}/blog</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(site.description)}</description>
    <language>en</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
