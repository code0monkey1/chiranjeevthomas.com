import Image from "next/image";
import Link from "next/link";
import { getProjects, site } from "@/lib/content";
import { RotatingWord } from "./RotatingWord";
import { CopyEmail } from "./CopyEmail";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./Icons";
import { MisoLauncher } from "./chat/MisoLauncher";

/** "a, b and c" for the screen-reader version of the rotating line. */
const listOf = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);

export function Hero() {
  const words = site.rotatingWords;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  // The first AI case studies double as evidence links under the intro.
  const work = getProjects().filter((p) => p.caseStudy && p.types.includes("ai-engineering")).slice(0, 3);
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        {/* Photo beside the name on desktop; on phones the photo sits beside the status, above the name. */}
        <div className="hero-id">
          <h1 id="hero-title" className="hero-title">
            <span className="hero-name">{site.name}</span>
            <span className="hero-role">Senior full-stack engineer building agentic AI</span>
          </h1>
          <p className="hero-status">
            <span>{site.location.split(",")[0]}</span>
            <span className="hs-sep" aria-hidden="true">·</span>
            <strong><span className="live-dot" aria-hidden="true" />{site.availability}</strong>
          </p>
          <figure className="hero-photo">
            <Image src={site.photo.src} alt={site.photo.alt} width={site.photo.width} height={site.photo.height} priority sizes="(max-width: 640px) 80px, 170px" />
          </figure>
        </div>
        <div className="hero-band">
          <div className="hero-body">
            <p className="intro">{site.intro}</p>
            {work.length > 0 && (
              <p className="hero-work">
                Selected work:{" "}
                {work.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    <Link href={`/projects/${p.slug}`}>{p.title}</Link>
                  </span>
                ))}
              </p>
            )}
            {/* The hidden longest word reserves the width, so the sentence never reflows while the words change. */}
            <p className="hero-rotate">
              <span aria-hidden="true">
                I build{" "}
                <span className="rot">
                  <span className="hl rot-sizer">{longest}</span>
                  <RotatingWord words={words} />
                </span>{" "}
                end to end.
              </span>
              <span className="sr-only">I build {listOf(words)} end to end.</span>
            </p>
          </div>
          <div className="hero-contact">
            <div className="cta-row">
              <a className="btn primary lg" href={`mailto:${site.email}`}><MailIcon />Email me</a>
              <CopyEmail email={site.email} />
            </div>
            <span className="hero-email mono">{site.email}</span>
            <div className="hero-links">
              <a href={site.socials.github}><GitHubIcon />GitHub</a>
              <a href={site.socials.linkedin}><LinkedInIcon />LinkedIn</a>
            </div>
          </div>
        </div>
        <MisoLauncher />
      </div>
    </section>
  );
}
