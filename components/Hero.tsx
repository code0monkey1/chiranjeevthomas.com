import Image from "next/image";
import { resumeHref, site } from "@/lib/content";
import { RotatingWord } from "./RotatingWord";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./Icons";
import { ChatMiso } from "./chat/ChatMiso";

export function Hero() {
  const longest = site.rotatingWords.reduce((a, b) => (b.length > a.length ? b : a));
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="grid-bg" aria-hidden="true" />
      <div className="hero-inner">
        <figure className="hero-photo">
          <div className="glow" aria-hidden="true" />
          <div className="frame">
            <Image src={site.photo.src} alt={site.photo.alt} width={site.photo.width} height={site.photo.height} priority sizes="(max-width: 640px) 112px, (max-width: 960px) 200px, 400px" />
          </div>
        </figure>
        <div className="hero-text">
          <div className="eyebrow rise">
            <span className="live-dot" aria-hidden="true" />
            Senior Full-Stack Engineer · Agentic AI · {site.location.split(",")[0]} · {site.availability}
          </div>
          {/* The hidden copy holds the longest phrase, so the headline's height never jumps as the words rotate. */}
          <h1 id="hero-title" className="hero-title rise" style={{ animationDelay: ".08s" }}>
            <span className="ht-sizer" aria-hidden="true">I build <span className="hl">{longest}</span> end to end.</span>
            <span className="ht-live">I build <RotatingWord words={site.rotatingWords} /> end to end.</span>
          </h1>
          <p className="intro rise" style={{ animationDelay: ".16s" }}>{site.intro}</p>
          <div className="cta-row rise" style={{ animationDelay: ".24s" }}>
            <a className="btn primary lg" href={`mailto:${site.email}`}><MailIcon />Email me</a>
            {resumeHref && <a className="btn lg" href={resumeHref} download>Download résumé</a>}
            <span className="social">
              <a href={site.socials.github}><GitHubIcon />GitHub</a>
              <a href={site.socials.linkedin}><LinkedInIcon />LinkedIn</a>
            </span>
          </div>
        </div>
        <ChatMiso />
      </div>
    </section>
  );
}
