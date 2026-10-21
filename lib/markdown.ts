import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

/** Markdown → HTML. Raw HTML comments are kept so widget markers survive. */
export async function renderMarkdown(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(file);
}

/** Splits rendered HTML on <!-- widget:name --> markers. */
export function splitWidgets(html: string): Array<{ html: string } | { widget: string }> {
  const parts: Array<{ html: string } | { widget: string }> = [];
  const re = /<!--\s*widget:([a-z0-9-]+)\s*-->/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) parts.push({ html: html.slice(last, m.index) });
    parts.push({ widget: m[1] });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ html: html.slice(last) });
  return parts;
}

/** Headings (h2) for a table of contents. */
export function headings(html: string) {
  return Array.from(html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)).map((m) => ({
    id: m[1],
    text: m[2].replace(/<[^>]+>/g, ""),
  }));
}
