import { getProjects, skills } from "@/lib/content";
import { Hero } from "@/components/Hero";
import { ProjectGrid } from "@/components/ProjectGrid";
import type { CardProject } from "@/components/ProjectCard";
import { SkillsShowcase } from "@/components/SkillsShowcase";
import { Experience } from "@/components/Experience";
import { Contact } from "@/components/Contact";

export default function Home() {
  const projects: CardProject[] = getProjects().map((p) => ({
    slug: p.slug, title: p.title, summary: p.summary, status: p.status, types: p.types, product: p.product,
    caseStudy: p.caseStudy, stack: p.stack, links: p.links, media: p.media,
  }));
  return (
    <>
      <Hero />
      <section id="work" className="section alt" aria-labelledby="work-title">
        <div className="wrap"><ProjectGrid projects={projects} /></div>
      </section>
      {/* Recruiters weigh experience before the skills list, so it comes first. */}
      <section id="experience" className="section" aria-labelledby="exp-title">
        <div className="wrap"><Experience /></div>
      </section>
      <section id="skills" className="section alt" aria-labelledby="skills-title">
        <div className="wrap"><SkillsShowcase groups={skills} /></div>
      </section>
      <Contact />
    </>
  );
}
