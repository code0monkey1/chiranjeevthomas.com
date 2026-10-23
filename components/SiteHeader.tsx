import Link from "next/link";
import { resumeHref, site } from "@/lib/content";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav aria-label="Primary">
        <Link href="/" className="brand">
          <span aria-hidden="true" className="brand-badge">ct</span>
          {site.name}
        </Link>
        <div className="nav-end">
          <NavLinks resumeHref={resumeHref} />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
