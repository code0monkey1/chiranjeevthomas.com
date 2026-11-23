import Link from "next/link";
import { experience, formatMonth } from "@/lib/content";

type Highlight = NonNullable<(typeof experience)[number]["highlights"]>[number];

/** Three highlights are enough to scan; the rest sit behind a disclosure so nothing is lost. */
const SHOWN = 3;

function Highlights({ items }: { items: Highlight[] }) {
  return items.map((h) => (
    <li key={h.title}>
      <span className={`impact${h.ai ? " ai" : ""}`}>{h.tag}</span>
      <span>
        <strong className="job-hl-title">{h.title}</strong> — {h.text}
        {h.link && <> <Link href={h.link} className="case-link">Case study →</Link></>}
      </span>
    </li>
  ));
}

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
              <span className="mono job-date">
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
              <div className="job-hl-wrap">
                <ul className="job-hl">
                  <Highlights items={j.highlights.slice(0, SHOWN)} />
                </ul>
                {j.highlights.length > SHOWN && (
                  <details className="job-more">
                    <summary>{j.highlights.length - SHOWN} more {j.highlights.length - SHOWN === 1 ? "highlight" : "highlights"}</summary>
                    <ul className="job-hl">
                      <Highlights items={j.highlights.slice(SHOWN)} />
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p className="sum">{j.summary}</p>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
