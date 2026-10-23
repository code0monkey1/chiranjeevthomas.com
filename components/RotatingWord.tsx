"use client";
import { useEffect, useState } from "react";

/**
 * Steps through the words once and stops on the last one. With reduced motion it shows the last word straight away.
 * The visible copy is hidden from screen readers; the caller provides one static sentence for them instead.
 */
export function RotatingWord({ words, interval = 1900 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [animate, setAnimate] = useState(false);
  const last = words.length - 1;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setI(last);
      return;
    }
    if (last < 1) return;
    setAnimate(true);
    const t = setInterval(() => setI((n) => {
      if (n + 1 >= last) clearInterval(t);
      return Math.min(n + 1, last);
    }), interval);
    return () => clearInterval(t);
  }, [last, interval]);
  return (
    <span key={i} className={`hl${animate && i > 0 ? " swap-in" : ""}`}>
      {words[i]}
    </span>
  );
}
