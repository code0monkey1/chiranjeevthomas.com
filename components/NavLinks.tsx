"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon, MenuIcon } from "./Icons";

const links = [
  { href: "/#work", label: "Projects" },
  { href: "/#experience", label: "Experience" },
  { href: "/#skills", label: "Skills" },
  { href: "/blog", label: "Writing" },
];

// Client-side so the header can mark the current section with aria-current and run the phone menu.
// On phones the links sit behind a Menu button; on wider screens the button is hidden and the links always show.
export function NavLinks({ resumeHref }: { resumeHref: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <>
      <button ref={button} type="button" className="nav-toggle" aria-expanded={open} aria-controls="nav-menu" onClick={() => setOpen((v) => !v)}>
        {open ? <CloseIcon /> : <MenuIcon />}Menu
      </button>
      <div ref={panel} id="nav-menu" className={`nav-links${open ? " open" : ""}`}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={close} aria-current={!l.href.startsWith("/#") && pathname.startsWith(l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
        {resumeHref && <a href={resumeHref} onClick={close} className="nav-resume">Résumé<span className="sr-only"> (PDF)</span></a>}
        <Link href="/#contact" onClick={close} className="nav-contact">Contact</Link>
      </div>
    </>
  );
}
