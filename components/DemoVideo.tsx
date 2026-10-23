"use client";
import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "./Icons";

/**
 * Renders the poster on the server and mounts the <video> after hydration.
 * Video browser extensions (speed controllers etc.) inject elements next to
 * <video> tags before React hydrates, which causes a hydration mismatch.
 *
 * Autoplay only runs while the video is on screen, and never for visitors who
 * prefer reduced motion: they get the poster and a play button instead.
 */
export function DemoVideo({ src, poster, alt, controls }: { src: string; poster: string; alt: string; controls?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMounted(true);
  }, []);

  const autoplay = mounted && (!reduced || started);
  useEffect(() => {
    const v = ref.current;
    if (!v || !autoplay) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [autoplay]);

  if (!mounted) return <img src={poster} alt={alt} />;
  if (reduced && !started) {
    return (
      <button type="button" className="video-play" onClick={() => setStarted(true)} aria-label={`Play video: ${alt}`}>
        <img src={poster} alt="" />
        <span aria-hidden="true"><PlayIcon /></span>
      </button>
    );
  }
  return <video ref={ref} src={src} poster={poster} muted loop playsInline controls={controls || reduced} preload="metadata" aria-label={alt} />;
}
