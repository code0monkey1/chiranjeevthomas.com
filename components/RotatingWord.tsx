"use client";
import { useEffect, useState } from "react";

/** Cycles through words continuously; never shows the same word twice in a row. */
export function RotatingWord({ words, interval = 2800 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || words.length < 2) return;
    setAnimate(true);
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span key={i} className={`hl${animate ? " swap" : ""}`} aria-live="off">
      {words[i]}
    </span>
  );
}
