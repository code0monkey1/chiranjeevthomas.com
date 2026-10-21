import { site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>© {new Date().getFullYear()} {site.name} · {site.location}</span>
        <span style={{ display: "flex", gap: 16 }}>
          <a href={site.socials.github}>GitHub</a>
          <a href={site.socials.linkedin}>LinkedIn</a>
          <a href={`mailto:${site.email}`}>Email</a>
          <a href="/rss.xml">RSS</a>
        </span>
      </div>
    </footer>
  );
}
