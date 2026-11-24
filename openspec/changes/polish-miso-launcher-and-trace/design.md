# Design

## Context

`MisoLauncher.tsx` renders a native button with the existing cat artwork and controls the native chat dialog. `ChatMiso.tsx` renders trace status and steps separately from the explanatory footer. Mobile layouts already expose Agent Trace through a toggle.

## Goals / Non-Goals

Keep the motion local to the launcher, preserve the button’s dimensions and focus behavior, and keep trace rendering in the existing pane. The scope is the interface. Chat responses, retrieval, and trace events continue through their existing paths.

## Decisions

- Animate an inert decorative dot along a rounded CSS motion path around the button. Define the path against the button’s box so it scales with the responsive layout. Give the dot a static orange shadow and keep the track outside the text area. CSS avoids a script-driven animation loop and keeps the effect independent of dialog state.
- Use the existing cat illustration and animate its wrapper with a small lean toward the text. Time the nudge with the orbit, let the idle sequence settle after a few seconds, and preserve a static accent under the site’s reduced-motion rule.
- Remove the explanatory footer and any CSS used only by that footer. Keep the existing trace body, mobile toggle, and header link in their current markup roles.

## Risks / Trade-offs

- The dot could overlap the focus ring or create horizontal overflow at phone widths. Check its full path at 360px and with keyboard focus, and keep it outside the label area while reserving room for the focus outline.
- A narrow trace pane can hide problems with the toggle or link. Check both the initial and populated trace states on mobile.

## Migration Plan

Ship through the existing GitHub PR and Netlify production deploy after verification. The previous Netlify deploy provides the rollback baseline.
