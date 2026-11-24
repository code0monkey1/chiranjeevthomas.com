"use client";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icons";

type Theme = "light" | "dark";

/**
 * Switches between light and dark. The theme is already on <html data-theme> before paint
 * (inline script in app/layout.tsx), so this only reads it after mount and keeps it in sync.
 * The site defaults to light and saves an explicit choice.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
  }

  // Before mount the theme isn't known on the server, so the button renders without an icon.
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}>
      {theme === "dark" ? <SunIcon /> : theme === "light" ? <MoonIcon /> : null}
    </button>
  );
}

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
}
