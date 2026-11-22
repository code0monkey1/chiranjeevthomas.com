## 1. Setup

- [x] 1.1 Confirm Paper Desktop is connected, then load the Paper guide and list the Projects folder
- [x] 1.2 Check Geist Sans and Geist Mono with `get_font_family_info`; decide Geist or the Inter and Paper Mono stand-ins
- [x] 1.3 Create the file `chiranjeevthomas.com — Design System` in the Projects folder

## 2. Tokens

- [x] 2.1 Register the light color tokens from `:root` in `app/globals.css` (ink, bg, sand, sienna, green, amber, lines, surfaces)
- [x] 2.2 Register the dark values from `:root[data-theme="dark"]` as `-dark` sibling tokens
- [x] 2.3 Register radius, spacing, type scale, and font family tokens
- [x] 2.4 Read the tokens back with `get_tokens` and compare each value to the CSS

## 3. Foundations artboard

- [x] 3.1 Create the Foundations artboard and add the color swatches, light and dark side by side, each labeled with name and hex
- [x] 3.2 Add the type scale (hero name, role, section heading, body, mono label) and the radius values
- [x] 3.3 Add the font-substitution note if Geist is unavailable (not needed: Geist is available in Paper)
- [x] 3.4 Screenshot, review against the Paper checkpoints, and fix issues

## 4. Components artboard

- [x] 4.1 Build the buttons (primary, default, disabled, large) using tokens
- [x] 4.2 Build the chips (default and selected), the four badges, and the tech tag
- [x] 4.3 Build the Ask Miso launcher and a project card
- [x] 4.4 Check that no component fill, text, or border is a hardcoded hex
- [x] 4.5 Screenshot, review, and fix issues

## 5. Page sample artboard

- [x] 5.1 Compose the header (brand badge, nav links, Contact pill) at 1200px content width, cloning components where possible
- [x] 5.2 Compose the hero (name, role, status line, intro, actions, Ask Miso launcher)
- [x] 5.3 Screenshot, review, and fix issues

## 6. Finish

- [x] 6.1 Call `finish_working_on_nodes` on each artboard
- [x] 6.2 Confirm "Welcome to Paper" is unchanged
- [x] 6.3 Open the file in Paper and show the user a screenshot of each artboard
- [x] 6.4 Note follow-ups for the user: hardcoded `#16a34a` live dot, sand-on-white text contrast
