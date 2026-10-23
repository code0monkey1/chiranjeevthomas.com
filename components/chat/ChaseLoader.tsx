"use client";
import { useEffect, useState } from "react";
import type { Mood } from "./RagdollCat";

const CREAM = "#FBF4EA";
const POINT = "#7A5F50";
const SCARF = "#F4A460";
const MOUSE = "#A8A29E";
const PINK = "#F2A7A0";
const EYE = "#5B9BD5";

/** Status line that follows what the request is actually doing, plus a running timer. */
function useStatus(mood: Mood) {
  const [start] = useState(() => performance.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, []);
  const secs = (now - start) / 1000;
  const label = secs > 6 ? "Almost got it…" : mood === "searching" ? "Searching his portfolio" : "Reading your question";
  return { label, secs };
}

/** Miso turns to face the visitor once per question, shortly after the chase starts. */
function useLookOnce(delay = 700, hold = 1100) {
  const [looking, setLooking] = useState(false);
  useEffect(() => {
    const on = setTimeout(() => setLooking(true), delay);
    const off = setTimeout(() => setLooking(false), delay + hold);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [delay, hold]);
  return looking;
}

/** Miso (side-on Ragdoll) galloping after a large mouse while an answer is on its way. */
export function ChaseLoader({ mood }: { mood: Mood }) {
  const { label, secs } = useStatus(mood);
  const looking = useLookOnce();
  // No live region here: the chat log around it already announces the status line.
  return (
    <div className={`chase${looking ? " looking" : ""}`}>
      <svg className="chase-track" viewBox="0 -22 360 96" aria-hidden="true">
        <line className="chase-ground" x1="0" y1="66" x2="360" y2="66" />
        <g className="chase-pair">
          {/* speed lines behind Miso */}
          <g className="chase-speed" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round">
            <line x1="-30" y1="18" x2="-12" y2="18" />
            <line x1="-38" y1="30" x2="-16" y2="30" />
            <line x1="-28" y1="42" x2="-14" y2="42" />
          </g>
          {/* Miso */}
          <g className="chase-cat">
            <g className="chase-bob">
              <path className="chase-tail" d="M10 26 C -4 22, -12 8, -2 -2" fill="none" stroke={POINT} strokeWidth="7" strokeLinecap="round" />
              <g className="chase-leg chase-leg-a"><rect x="14" y="30" width="7" height="22" rx="3.5" fill={POINT} /></g>
              <g className="chase-leg chase-leg-b"><rect x="54" y="30" width="7" height="22" rx="3.5" fill={POINT} /></g>
              <ellipse cx="36" cy="29" rx="29" ry="13" fill={CREAM} stroke="#E7DCCF" strokeWidth="1.5" />
              <g className="chase-leg chase-leg-b"><rect x="22" y="31" width="7" height="22" rx="3.5" fill="#8C6F5E" /></g>
              <g className="chase-leg chase-leg-a"><rect x="60" y="31" width="7" height="22" rx="3.5" fill="#8C6F5E" /></g>
              <path d="M58 18 q6 10 0 18" fill="none" stroke={SCARF} strokeWidth="6" strokeLinecap="round" />
              <path className="chase-scarf" d="M58 22 l-12 -6" stroke={SCARF} strokeWidth="5" strokeLinecap="round" />

              {/* head, side-on: eyes on the mouse */}
              <g className="cat-side">
                <path className="chase-ear" d="M62 10 L64 -4 L71 7 Z" fill={POINT} />
                <path className="chase-ear chase-ear-2" d="M73 7 L80 -3 L82 11 Z" fill={POINT} />
                <circle cx="72" cy="20" r="13" fill={CREAM} stroke="#E7DCCF" strokeWidth="1.5" />
                <ellipse cx="77" cy="23" rx="8.5" ry="7.5" fill={POINT} opacity="0.85" />
                <ellipse cx="77" cy="17" rx="2.6" ry="3" fill={EYE} />
                <ellipse cx="77.6" cy="17.3" rx="1" ry="2.2" fill="#1B2533" />
                <circle cx="85" cy="23" r="1.6" fill="#E79A9A" />
                <path d="M84 26 l9 -1 M84 27.5 l9 2" stroke="#E7DCCF" strokeWidth="0.9" strokeLinecap="round" />
              </g>

              {/* head, facing the visitor: shown once per question */}
              <g className="cat-front">
                <path d="M60 11 L62 -3 L69 6 Z" fill={POINT} />
                <path d="M75 6 L82 -3 L84 11 Z" fill={POINT} />
                <circle cx="72" cy="20" r="13.5" fill={CREAM} stroke="#E7DCCF" strokeWidth="1.5" />
                <ellipse cx="72" cy="24" rx="9.5" ry="8" fill={POINT} opacity="0.85" />
                <g className="cat-front-eyes">
                  <ellipse cx="67" cy="18.5" rx="2.8" ry="3.2" fill={EYE} />
                  <ellipse cx="77" cy="18.5" rx="2.8" ry="3.2" fill={EYE} />
                  <ellipse cx="67" cy="18.8" rx="1.1" ry="2.3" fill="#1B2533" />
                  <ellipse cx="77" cy="18.8" rx="1.1" ry="2.3" fill="#1B2533" />
                  <circle cx="68" cy="17.4" r="0.9" fill="#fff" />
                  <circle cx="78" cy="17.4" r="0.9" fill="#fff" />
                </g>
                <path d="M70.6 23.4 h2.8 l-1.4 1.6 z" fill="#E79A9A" />
                <path d="M69 26.2 q1.5 1.6 3 0 q1.5 1.6 3 0" fill="none" stroke="#2E2219" strokeWidth="0.9" strokeLinecap="round" />
                <path d="M58 23 l7 1 M58 26 l7 -0.5 M86 23 l-7 1 M86 26 l-7 -0.5" stroke="#E7DCCF" strokeWidth="0.8" strokeLinecap="round" />
                <path className="cat-heart" d="M92 -12 c-3 -5 -10 -2 -7 3 l7 7 l7 -7 c3 -5 -4 -8 -7 -3 z" fill="#E9735A" stroke="#fff" strokeWidth="1.2" />
              </g>
            </g>
          </g>
          {/* the (large) mouse */}
          <g className="chase-mouse" transform="translate(128 4)">
            <g className="chase-jink">
              <g className="chase-hop">
                <path className="chase-mtail" d="M8 40 C -10 46, -18 30, -30 40" fill="none" stroke={PINK} strokeWidth="3" strokeLinecap="round" />
                <g className="chase-leg chase-leg-a"><ellipse cx="18" cy="52" rx="6" ry="3.5" fill={PINK} /></g>
                <g className="chase-leg chase-leg-b"><ellipse cx="40" cy="52" rx="6" ry="3.5" fill={PINK} /></g>
                <ellipse cx="30" cy="38" rx="26" ry="15" fill={MOUSE} />
                <circle cx="46" cy="21" r="10" fill={MOUSE} />
                <circle cx="46" cy="21" r="6" fill={PINK} />
                <ellipse cx="55" cy="36" rx="13" ry="10" fill={MOUSE} />
                <circle cx="59" cy="32" r="2" fill="#1C1917" />
                <circle cx="68" cy="37" r="2.4" fill="#E79A9A" />
                <path d="M66 39 l10 -2 M66 41 l10 3" stroke="#78716C" strokeWidth="0.9" strokeLinecap="round" />
              </g>
              {/* startled "!" when Miso lunges close */}
              <g className="chase-alert">
                <rect x="34" y="-6" width="4" height="11" rx="2" fill="#B91C1C" />
                <circle cx="36" cy="9" r="2.2" fill="#B91C1C" />
              </g>
            </g>
          </g>
          {/* dust kicked up behind Miso */}
          <g className="chase-dust" fill="#E7E5E4">
            <circle cx="-6" cy="60" r="4" />
            <circle cx="-16" cy="56" r="3" />
            <circle cx="-24" cy="61" r="2.5" />
          </g>
        </g>
      </svg>
      <p className="chase-label">
        {looking ? "Miso glances at you…" : label}
        <span className="chase-time" aria-hidden="true">{secs.toFixed(1)}s</span>
      </p>
    </div>
  );
}
