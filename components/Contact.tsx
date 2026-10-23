import { resumeHref, site } from "@/lib/content";
import { LinkedInIcon, MailIcon } from "./Icons";

/** Closing call to action: the page ends with how to reach Chiranjeev, not with the oldest job. */
export function Contact() {
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="wrap contact-inner">
        <div>
          <h2 id="contact-title">Hiring for an AI engineering role?</h2>
          <p>
            I’m a senior full-stack engineer who ships LLM features to production, and I’m {site.availability.toLowerCase()}.
            Email me, or <a href="#ask-miso">ask Miso</a> anything about my work first.
          </p>
        </div>
        <div className="cta-row">
          <a className="btn primary lg" href={`mailto:${site.email}`}><MailIcon />Email me</a>
          {resumeHref && <a className="btn lg" href={resumeHref} download>Download résumé</a>}
          <a className="btn lg" href={site.socials.linkedin}><LinkedInIcon />LinkedIn</a>
        </div>
        <p className="contact-email">{site.email}</p>
      </div>
    </section>
  );
}
