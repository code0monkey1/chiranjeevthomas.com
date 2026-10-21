import Link from "next/link";
import { site } from "@/lib/content";

const links = [
  { href: "/#work", label: "Projects" },
  { href: "/#skills", label: "Skills" },
  { href: "/#experience", label: "Experience" },
  { href: "/blog", label: "Writing" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav aria-label="Primary">
        <Link href="/" className="brand">
          <span aria-hidden="true" className="brand-badge">ct</span>
          {site.name}
        </Link>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
