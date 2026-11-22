# Design

## Context

`app/globals.css` is the only source of truth for the site's tokens: a `:root` block for light and a `:root[data-theme="dark"]` block of overrides, plus class rules for components (`.btn`, `.chip-btn`, `.badge-*`, `.tech`, `.miso-launcher`, `.project-card`). Fonts are Geist Sans and Geist Mono (`node_modules/geist`). Paper's only existing file, "Welcome to Paper", carries Paper's default Tailwind tokens (gray and blue scales, Inter). The Paper MCP writes through `write_html`, `set_tokens`, and `update_styles`, and its guide asks for small writes with a screenshot review after each group. See proposal.md for motivation and scope.

## Goals / Non-Goals

**Goals:**
- A Paper file whose tokens and components can be checked line by line against `app/globals.css`.
- Light and dark both visible, since the site ships both themes.

**Non-Goals:**
- No sync mechanism from CSS to Paper. The file is built once and updated by hand when tokens change.
- No code export from Paper into the repo.

## Decisions

**New file, not the welcome file.** A new file keeps the site's tokens from mixing with Paper's default scales, and leaves their onboarding content intact. Alternative: a new page in "Welcome to Paper" (rejected: one token set per file, so both token sets would collide).

**Mirror, don't redesign.** The file exists to reflect the live system, so values are copied from the CSS rather than reinterpreted. The design guide's palette advice (mood word, avoiding warm-white with sienna) is deliberately not applied; the brand is already chosen. Known weaknesses are listed as follow-ups, not fixed here.

**Token names follow the CSS, in Paper's namespaces.** `--ink` becomes `--color-ink`, `--sand` becomes `--color-sand`, and so on, so the mapping is mechanical. Dark values are registered as `--color-ink-dark` style siblings, because Paper tokens hold one value each. Alternative: only light tokens plus a separate dark artboard with hardcoded hex (rejected: components would stop referencing tokens).

**Light-mode components, dark shown as a mirrored row.** Components reference light tokens. The Foundations artboard shows dark swatches, and the Page sample is built once in light. A dark copy of the page sample is optional, not required by the spec.

**Build in small writes.** One visual group per `write_html` call, with a screenshot review after each artboard, as the Paper guide requires. `finish_working_on_nodes` is called when done.

**Fonts.** Check Geist availability with `get_font_family_info` before any text is written. If missing, use Inter and Paper Mono and add the disclosure note the spec requires.

## Risks / Trade-offs

- [Paper file drifts from the CSS] → The Foundations artboard labels each token with its CSS name and hex, so a diff is a quick visual check; a follow-up change could script it.
- [Dark tokens as separate names add noise] → Keep the `-dark` suffix consistent and list them in one group.
- [Geist missing in Paper] → Inter and Paper Mono stand-ins, disclosed on the artboard.
- [Paper Desktop disconnects mid-build] → Each artboard is a complete unit, so a stopped run leaves finished artboards intact; resume from the next unfinished one.

## Open Questions

- Whether to also produce a dark copy of the Page sample. Safe to decide after the light version is reviewed.
