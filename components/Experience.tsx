import Link from "next/link";
import { experience, formatMonth } from "@/lib/content";

export function Experience() {
  return (
    <>
      <div className="section-head">
        <div>
          <h2 id="exp-title">Experience</h2>
        </div>
      </div>
      <ol className="jobs">
        {experience.map((j) => (
          <li key={j.company} className={`job lift${j.highlights ? "" : " small"}`}>
            <div className="job-meta">
              <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
                {formatMonth(j.start)} — {formatMonth(j.end)}
              </span>
              <h3>{j.company}</h3>
              <p className="role">{j.role}</p>
              {j.context && <p className="ctx">{j.context}</p>}
              {j.stack && (
                <ul className="tech-list" aria-label="Stack">{j.stack.map((s) => <li key={s} className="tech">{s}</li>)}</ul>
              )}
            </div>
            {j.highlights ? (
              <ul className="job-hl">
                {j.highlights.map((h) => (
                  <li key={h.title}>
                    <span className={`impact${h.ai ? " ai" : ""}`}>{h.tag}</span>
                    <span>
                      <strong style={{ fontWeight: 600, color: "var(--ink)" }}>{h.title}</strong> — {h.text}
                      {h.link && <> <Link href={h.link} style={{ color: "var(--sienna)" }}>Case study →</Link></>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sum">{j.summary}</p>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
