"use client";
import { useEffect, useState } from "react";

/**
 * Renders the poster on the server and mounts the <video> after hydration.
 * Video browser extensions (speed controllers etc.) inject elements next to
 * <video> tags before React hydrates, which causes a hydration mismatch.
 */
export function DemoVideo({ src, poster, alt, controls }: { src: string; poster: string; alt: string; controls?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <img src={poster} alt={alt} />;
  return <video src={src} poster={poster} autoPlay muted loop playsInline controls={controls} preload="metadata" aria-label={alt} />;
}
