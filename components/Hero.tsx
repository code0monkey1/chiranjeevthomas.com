import Image from "next/image";
import { site } from "@/lib/content";
import { RotatingWord } from "./RotatingWord";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./Icons";
import { ChatMiso } from "./chat/ChatMiso";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="grid-bg" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-text">
          <div className="eyebrow rise">
            <span className="live-dot" aria-hidden="true" />
            Senior Full-Stack Engineer · Agentic AI · {site.location.split(",")[0]} · {site.availability}
          </div>
          <h1 id="hero-title" className="rise" style={{ animationDelay: ".08s" }}>
            I build <RotatingWord words={site.rotatingWords} /> end to end.
          </h1>
          <p className="intro rise" style={{ animationDelay: ".16s" }}>{site.intro}</p>
          <div className="social rise" style={{ animationDelay: ".24s" }}>
            <a href={site.socials.github}><GitHubIcon />GitHub</a>
            <a href={site.socials.linkedin}><LinkedInIcon />LinkedIn</a>
            <a href={`mailto:${site.email}`}><MailIcon />{site.email}</a>
          </div>
        </div>
        <figure className="hero-photo">
          <div className="glow" aria-hidden="true" />
          <Image src={site.photo.src} alt={site.photo.alt} width={site.photo.width} height={site.photo.height} priority sizes="400px" />
        </figure>
        <ChatMiso />
      </div>
    </section>
  );
}
