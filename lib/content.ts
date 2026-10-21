import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import * as yaml from "js-yaml";
import { z } from "zod";

const ROOT = path.join(process.cwd(), "content");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* ---------- site ---------- */
const SiteSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  jobTitle: z.string(),
  title: z.string(),
  description: z.string(),
  intro: z.string(),
  location: z.string(),
  email: z.string().email(),
  availability: z.string(),
  photo: z.object({ src: z.string(), alt: z.string(), width: z.number(), height: z.number() }),
  rotatingWords: z.array(z.string()).min(1),
  socials: z.object({ github: z.string().url(), linkedin: z.string().url(), medium: z.string().url().optional() }),
  knowsAbout: z.array(z.string()),
});
export type Site = z.infer<typeof SiteSchema>;
/** Production reads each YAML file once; dev re-reads so the chat index picks up edits without a restart. */
const fresh = <T>(load: () => T) => {
  let value: T | undefined;
  return () => (process.env.NODE_ENV === "production" ? (value ??= load()) : load());
};
export const getSite = fresh(() => SiteSchema.parse(yaml.load(read("site.yaml"))));
export const site: Site = getSite();

/** Drop a résumé at public/resume.pdf and the hero and contact section link to it. */
export const resumeHref = fs.existsSync(path.join(process.cwd(), "public", "resume.pdf")) ? "/resume.pdf" : null;

/* ---------- tags ---------- */
const TagSchema = z.object({ label: z.string(), description: z.string(), type: z.boolean().optional() });
export type Tag = z.infer<typeof TagSchema> & { slug: string };
const rawTags = z.record(z.string(), TagSchema).parse(yaml.load(read("tags.yaml")));
export const tags: Record<string, Tag> = Object.fromEntries(
  Object.entries(rawTags).map(([slug, t]) => [slug, { ...t, slug }]),
);
function checkTags(where: string, list: string[]) {
  for (const t of list) {
    if (!tags[t]) throw new Error(`Unknown tag "${t}" in ${where}. Add it to content/tags.yaml or fix the spelling.`);
  }
}

/* ---------- projects ---------- */
const ProjectSchema = z.object({
  title: z.string(),
  headline: z.string(),
  summary: z.string(),
  description: z.string(),
  status: z.string(),
  date: z.coerce.date(),
  featured: z.boolean().default(false),
  order: z.number().optional(),
  product: z.boolean().default(false),
  caseStudy: z.boolean().default(true),
  types: z.array(z.string()).min(1),
  tags: z.array(z.string()).default([]),
  stack: z.array(z.string()),
  links: z
    .object({
      demo: z.string().url().optional(),
      github: z.string().url().optional(),
      howNote: z.string().optional(),
      demoNote: z.string().optional(),
      githubNote: z.string().optional(),
    })
    .default({}),
  media: z.object({ video: z.string(), poster: z.string(), alt: z.string() }).optional(),
});
export type Project = z.infer<typeof ProjectSchema> & { slug: string; body: string; allTags: string[] };

const STATUS_RANK: Record<string, number> = { "At Grabbit": 0, Live: 1, "SaaS product": 2, "Open source": 3, "In progress": 4 };

export function getProjects(): Project[] {
  const dir = path.join(ROOT, "projects");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      const p = ProjectSchema.parse(data);
      checkTags(`projects/${file} (types)`, p.types);
      checkTags(`projects/${file} (tags)`, p.tags);
      return { ...p, slug, body: content, allTags: Array.from(new Set([...p.types, ...p.tags])) };
    })
    .sort(
      (a, b) =>
        (a.order ?? 99) - (b.order ?? 99) ||
        Number(b.featured) - Number(a.featured) ||
        (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
        b.date.getTime() - a.date.getTime(),
    );
}
export const getProject = (slug: string) => getProjects().find((p) => p.slug === slug);

/* ---------- posts ---------- */
const PostSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  project: z.string().optional(),
  draft: z.boolean().default(false),
});
export type Post = z.infer<typeof PostSchema> & { slug: string; body: string; readingMinutes: number };

export function getPosts({ includeDrafts = false } = {}): Post[] {
  const dir = path.join(ROOT, "posts");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      const p = PostSchema.parse(data);
      checkTags(`posts/${file}`, p.tags);
      const words = content.split(/\s+/).filter(Boolean).length;
      return { ...p, slug, body: content, readingMinutes: Math.max(1, Math.round(words / 220)) };
    })
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
export const getPost = (slug: string) => getPosts().find((p) => p.slug === slug);

/* ---------- experience & skills ---------- */
const HighlightSchema = z.object({ tag: z.string(), ai: z.boolean().optional(), title: z.string(), text: z.string(), link: z.string().optional() });
const JobSchema = z.object({
  company: z.string(),
  role: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  context: z.string().optional(),
  stack: z.array(z.string()).optional(),
  highlights: z.array(HighlightSchema).optional(),
  summary: z.string().optional(),
});
export type Job = z.infer<typeof JobSchema>;
export const getExperience = fresh((): Job[] => z.array(JobSchema).parse(yaml.load(read("experience.yaml"))));
export const experience: Job[] = getExperience();

const SkillGroupSchema = z.object({
  title: z.string(),
  kind: z.enum(["ai", "fullstack"]),
  items: z.array(z.object({ name: z.string(), used: z.string(), link: z.string().optional() })),
});
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export const getSkills = fresh((): SkillGroup[] => z.array(SkillGroupSchema).parse(yaml.load(read("skills.yaml"))));
export const skills: SkillGroup[] = getSkills();

/* ---------- helpers ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatMonth(ym: string) {
  if (ym === "present") return "Present";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function usedTags(kind: "projects" | "posts" | "all" = "all") {
  const set = new Set<string>();
  if (kind !== "posts") getProjects().forEach((p) => p.allTags.forEach((t) => set.add(t)));
  if (kind !== "projects") getPosts().forEach((p) => p.tags.forEach((t) => set.add(t)));
  return Array.from(set);
}
