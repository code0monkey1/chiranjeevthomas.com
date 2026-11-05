import Image from "next/image";
import { site } from "@/lib/content";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./Icons";
import { MisoLauncher } from "./chat/MisoLauncher";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-text">
          <div className="hero-head">
            <h1 id="hero-title" className="hero-title">
              <span className="hero-name">{site.name}</span>
              <span className="hero-role">Senior full-stack engineer building agentic AI</span>
            </h1>
            <p className="hero-status">
              <strong><span className="live-dot" aria-hidden="true" />{site.availability}</strong>
              <span>{site.location.split(",")[0]}</span>
            </p>
          </div>
          <div className="hero-body">
            <p className="intro">{site.intro}</p>
            <div className="hero-actions">
              <a className="btn primary lg" href={`mailto:${site.email}`}><MailIcon />Email me</a>
              <a className="hero-link" href={site.socials.github} aria-label="GitHub" title="GitHub"><GitHubIcon /></a>
              <a className="hero-link" href={site.socials.linkedin} aria-label="LinkedIn" title="LinkedIn"><LinkedInIcon /></a>
            </div>
          </div>
        </div>
        {/* Miso is the cat in the photo, so the chat launcher sits directly under it. */}
        <div className="hero-aside">
          <figure className="hero-photo">
            <Image src={site.photo.src} alt={site.photo.alt} width={site.photo.width} height={site.photo.height} priority sizes="(max-width: 640px) min(100vw - 32px, 360px), clamp(280px, 38vw, 360px)" />
          </figure>
          <MisoLauncher />
        </div>
      </div>
    </section>
  );
}
