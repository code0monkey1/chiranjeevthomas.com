# Proposal

## Why

The site's design system exists only as CSS variables and class rules in `app/globals.css`. There is no visual reference for it: no place to see the palette, type scale, and components side by side, in both themes, or to sketch new sections against real tokens. The Paper desktop app is now connected through MCP, so a design-system file can be built there and kept as the visual counterpart of the code.

## What Changes

- Create a new Paper file, `chiranjeevthomas.com — Design System`, in the Projects folder. The existing "Welcome to Paper" file is left untouched.
- Register the site's tokens in that file as Paper design tokens, in the Tailwind v4 namespaces Paper expects: colors (ink, bg, sand, sienna, green, amber, lines, surfaces, light and dark pairs), radius, spacing, type scale, font families.
- Build three artboards: **Foundations** (color, type, radius, spacing), **Components** (buttons, chips, badges, tech tags, Ask Miso launcher, project card), **Page sample** (header and hero composed from those parts).
- Mirror the live system exactly. No redesign, and no edits to `app/globals.css` or any component.
- Open the file in Paper and show screenshots of each artboard.

Out of scope: changing site tokens, fixing the hardcoded `#16a34a` live dot or the sand-on-white contrast (noted as follow-ups, not done here), exporting Paper designs back to code, and designs for pages other than the home header and hero.

## Capabilities

### New Capabilities
- `design-system-reference`: a Paper file that mirrors the site's design tokens and core components, in light and dark, so the visual system can be inspected and designed against without reading CSS.

### Modified Capabilities
<!-- None. No existing capability's requirements change. -->

## Impact

- **Paper**: one new file, with tokens and three artboards. No existing Paper file is modified.
- **Repo**: only `openspec/changes/paper-design-system/` is added. No source, CSS, or content changes.
- **Dependencies**: Paper Desktop running with the Paper MCP connected. Geist Sans and Geist Mono must be available to Paper; if they are not, Inter and Paper Mono stand in and the artboards say so.
