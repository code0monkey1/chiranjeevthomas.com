export type Mood =
  | "idle" | "listening" | "thinking" | "searching" | "talking" | "happy" | "confused"
  | "smile" | "smirk" | "laugh" | "cry";

const INK = "#2E2219";
const CREAM = "#FBF4EA";
const POINT = "#7A5F50";
const SCARF = "#F6B98A";
const SCARF2 = "#F4A460";

function Eye({ cx, lash, blink = true }: { cx: number; lash: string; blink?: boolean }) {
  return (
    <g className={blink ? "blink" : undefined}>
      <ellipse cx={cx} cy={31.5} rx={5} ry={5.7} fill="#5B9BD5" />
      <ellipse cx={cx} cy={32.6} rx={3.7} ry={3.9} fill="#8EC1EE" opacity={0.55} />
      <ellipse cx={cx} cy={31.9} rx={1.8} ry={4} fill="#1B2533" />
      <circle cx={cx + 1.7} cy={29.4} r={1.6} fill="#fff" />
      <circle cx={cx - 1.6} cy={34} r={0.75} fill="#fff" />
      <path d={`M${cx - 5.3} 29.6 Q${cx} 24.4 ${cx + 5.3} 29.6`} fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
      <path d={lash} stroke={INK} strokeWidth={1.15} strokeLinecap="round" />
    </g>
  );
}
const LASH_L = "M16.4 28.6 L13.4 26.2M17.7 27 L15.5 24.2M19.4 25.9 L18.1 22.8";
const LASH_R = "M43.6 28.6 L46.6 26.2M42.3 27 L44.5 24.2M40.6 25.9 L41.9 22.8";

/** An original Ragdoll cat in a light-orange scarf. Expression follows `mood`. */
export function RagdollCat({ mood = "idle", size = 56, still = false }: { mood?: Mood; size?: number; still?: boolean }) {
  const m = still ? "happy" : mood;
  const closedHappy = m === "happy" || m === "laugh";
  const openEyes = !closedHappy && m !== "confused";
  const mouth =
    m === "talking" ? "talk" : m === "thinking" ? "o" : m === "happy" ? "big" : m === "confused" ? "wavy" : m === "searching" ? "flat"
    : m === "smile" ? "smileBig" : m === "smirk" ? "smirk" : m === "laugh" ? "laugh" : m === "cry" ? "cry" : "smile";
  const anim = m === "laugh" ? "laugh-shake" : m === "cry" ? "cry-sob" : undefined;
  const earStyle = { transition: "transform .3s", transformBox: "view-box" as const, transformOrigin: "30px 30px", transform: m === "listening" ? "translateY(-2px) scale(1.06)" : m === "confused" ? "rotate(-4deg)" : undefined };
  const gaze = m === "thinking" ? "translate(1.5px,-2.5px)" : m === "listening" ? "translateY(-0.5px) scale(1.04)" : undefined;
  const blush = m === "happy" || m === "smile" || m === "laugh" ? 0.65 : m === "cry" ? 0.5 : 0.3;

  return (
    <svg aria-hidden="true" className={anim} viewBox="0 0 60 68" width={size} height={Math.round((size * 68) / 60)} style={{ display: "block", overflow: "visible" }}>
      <g style={earStyle}>
        <g className={still ? undefined : "earL"}><polygon points="8,27 12,4 27,16" fill={POINT} /><polygon points="12,21 14,10 22,16" fill="#E8B4A6" /></g>
        <g className={still ? undefined : "earR"}><polygon points="52,27 48,4 33,16" fill={POINT} /><polygon points="48,21 46,10 38,16" fill="#E8B4A6" /></g>
      </g>
      <polygon points="10,33 2,38 9,40 3,45 11,45 7,50 15,47" fill={CREAM} />
      <polygon points="50,33 58,38 51,40 57,45 49,45 53,50 45,47" fill={CREAM} />
      <ellipse cx={30} cy={34} rx={22} ry={18.5} fill={CREAM} />
      <ellipse cx={30} cy={31} rx={15.5} ry={10} fill="#B89A86" opacity={0.42} />
      <path d="M30 21 L25.5 34 L34.5 34 Z" fill="#9C7C67" opacity={0.45} />
      <path d="M30 16 Q28.6 20 30 24 Q31.4 20 30 16Z" fill="#fff" opacity={0.8} />
      <ellipse cx={30} cy={41} rx={9.5} ry={6.8} fill="#fff" />

      {openEyes && (
        <g className={m === "searching" ? "scan" : undefined} style={{ transition: "transform .3s", transform: gaze }}>
          <Eye cx={21} lash={LASH_L} blink={!still} />
          <Eye cx={39} lash={LASH_R} blink={!still} />
        </g>
      )}
      {closedHappy && (
        <g>
          <path d="M15.8 32.6 Q21 27 26.2 32.6M33.8 32.6 Q39 27 44.2 32.6" fill="none" stroke={INK} strokeWidth={2.3} strokeLinecap="round" />
          <path d="M16.2 32 L13.3 30.3M17.3 30.4 L15 28.2M43.8 32 L46.7 30.3M42.7 30.4 L45 28.2" stroke={INK} strokeWidth={1.15} strokeLinecap="round" />
        </g>
      )}
      {m === "confused" && (
        <g>
          <Eye cx={21} lash={LASH_L} blink={false} />
          <path d="M33.8 32.4 Q39 34 44.2 32.4M33.4 24.6 L44.4 27.2" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}
      {m === "smirk" && (
        <g>
          <path d="M33.4 25 L44.8 25 L44.8 31.6 Q39 29.4 33.4 31.6 Z" fill="#DCCBBE" />
          <path d="M33.4 31.6 Q39 29.4 44.8 31.6" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
          <path d="M15.5 22.6 Q21 19.6 26.5 22.4" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )}
      {m === "cry" && (
        <g>
          <path d="M15 26.2 L25.8 21.8M45 26.2 L34.2 21.8" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          <path d="M18.6 36 Q17.4 42 18.8 49M41.4 36 Q42.6 42 41.2 49" fill="none" stroke="#8EC4F2" strokeWidth={3.2} strokeLinecap="round" opacity={0.9} />
          <path className="tear" d="M17.6 37 q-2.8 4.4 0 6 q2.8 -1.6 0 -6Z" fill="#5FA8E8" />
          <path className="tear t2" d="M42.4 37 q-2.8 4.4 0 6 q2.8 -1.6 0 -6Z" fill="#5FA8E8" />
        </g>
      )}
      {m === "laugh" && (
        <g>
          <path className="tear" d="M14.6 31 q-1.6 2.6 0 3.6 q1.6 -1 0 -3.6Z" fill="#7DB8EC" />
          <path className="tear t2" d="M45.4 31 q-1.6 2.6 0 3.6 q1.6 -1 0 -3.6Z" fill="#7DB8EC" />
        </g>
      )}

      <circle cx={15.5} cy={39.5} r={3} fill="#F2A7A0" opacity={blush} />
      <circle cx={44.5} cy={39.5} r={3} fill="#F2A7A0" opacity={blush} />
      <path d="M27.8 37.6 L32.2 37.6 L30 40.1 Z" fill="#E79A9A" />

      {mouth === "smile" && <path d="M30 40.1 Q27.3 43.6 25 41.8M30 40.1 Q32.7 43.6 35 41.8" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />}
      {mouth === "talk" && <ellipse className="talk" cx={30} cy={43.4} rx={2.7} ry={2.1} fill="#8A3B3B" />}
      {mouth === "o" && <circle cx={30} cy={43.6} r={1.8} fill="#8A3B3B" />}
      {mouth === "big" && <g><path d="M24.5 41.2 Q30 48.5 35.5 41.2 Z" fill="#8A3B3B" /><path d="M27.5 45 Q30 47 32.5 45" fill="none" stroke="#E79A9A" strokeWidth={1.2} /></g>}
      {mouth === "wavy" && <path d="M25 44 q2.5 -2 5 0 t5 0" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />}
      {mouth === "flat" && <path d="M27 43.5 L33 43.5" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />}
      {mouth === "smileBig" && <g><path d="M23.6 41 Q30 47.6 36.4 41" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round" /><path d="M23.2 40.4 L22.6 39.6M36.8 40.4 L37.4 39.6" stroke={INK} strokeWidth={1.3} strokeLinecap="round" /></g>}
      {mouth === "smirk" && <path d="M25.5 43.2 Q30.5 44.6 35.6 40.2" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />}
      {mouth === "laugh" && <g><path d="M22.8 40.6 Q30 51 37.2 40.6 Z" fill="#8A3B3B" /><path d="M26 46.4 Q30 49 34 46.4" fill="none" stroke="#E79A9A" strokeWidth={1.6} /></g>}
      {mouth === "cry" && <g><path d="M24.4 46.8 Q30 39.6 35.6 46.8 Q30 44.6 24.4 46.8 Z" fill="#8A3B3B" /><path d="M24.4 46.8 Q30 39.6 35.6 46.8" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" /></g>}

      <path d="M19 40.5 7 38.5M19 42.5 7 44M41 40.5 53 38.5M41 42.5 53 44" stroke="#A88D7C" strokeWidth={0.8} strokeLinecap="round" opacity={0.7} />
      <path d="M11 49 Q30 58.5 49 49 L48.5 55 Q30 64 11.5 55 Z" fill={SCARF} />
      <path d="M14 52.5 Q30 60.5 46 52.5" fill="none" stroke={SCARF2} strokeWidth={1.1} opacity={0.7} />
      <g className={still ? undefined : "scarf-tail"}>
        <path d="M38 56 L42.5 66 L47.5 64.5 L43 55 Z" fill={SCARF} />
        <path d="M42.5 66 l0.6 1.8M44.2 65.5 l0.6 1.8M45.9 65 l0.6 1.8" stroke={SCARF2} strokeWidth={0.9} strokeLinecap="round" />
      </g>
      <ellipse cx={41} cy={55.5} rx={3.6} ry={3} fill={SCARF2} />
    </svg>
  );
}

export const MOOD_TEXT: Record<Mood, string> = {
  idle: "here to help", listening: "listening…", thinking: "thinking…", searching: "searching the portfolio…",
  talking: "answering…", happy: "found it!", confused: "hmm, not sure about that",
  smile: "smiling", smirk: "smirking", laugh: "laughing!", cry: "crying…",
};
