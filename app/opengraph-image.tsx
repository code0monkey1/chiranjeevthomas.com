import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

export const alt = `${site.name} — ${site.jobTitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#ffffff", color: "#111" }}>
        <div style={{ display: "flex", fontSize: 26, color: "#8a5a2b", letterSpacing: 2, textTransform: "uppercase" }}>{site.jobTitle}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>{site.name}</div>
          <div style={{ display: "flex", fontSize: 40, color: "#444" }}>
            I build&nbsp;<span style={{ color: "#c46a1f" }}>agentic applications</span>&nbsp;end to end.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#666" }}>
          <span>chiranjeevthomas.com</span>
          <div style={{ width: 220, height: 10, background: "#F4A460", borderRadius: 5 }} />
        </div>
      </div>
    ),
    size,
  );
}
