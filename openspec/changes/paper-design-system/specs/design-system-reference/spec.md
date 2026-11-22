# Spec Delta

## Purpose

A Paper design file that mirrors the site's design tokens and core components in light and dark, so the visual system can be inspected and designed against without reading CSS.

## ADDED Requirements

### Requirement: A dedicated Paper file holds the design system
The design system SHALL live in its own Paper file named `chiranjeevthomas.com — Design System`, in the Projects folder, separate from any other Paper file.

#### Scenario: Finding the file
- **WHEN** the Paper Projects folder is listed
- **THEN** the folder contains the design-system file, and "Welcome to Paper" has no new or changed artboards or tokens

### Requirement: Tokens mirror the site's CSS
The file SHALL register the site's colors, radius, type scale, and font families as Paper design tokens, with values equal to those in `app/globals.css`, including both the light and dark values of each themed color.

#### Scenario: Comparing a color token
- **WHEN** a token such as sand, ink, or sienna is read from the Paper file
- **THEN** its light value equals the `:root` value in `app/globals.css`, and its dark value equals the `:root[data-theme="dark"]` value

#### Scenario: Token set is not Paper's default
- **WHEN** the file's tokens are listed
- **THEN** they are the site's tokens and do not include Paper's default gray and blue scales

### Requirement: Foundations artboard shows the primitives
A Foundations artboard SHALL show every color token as a swatch labeled with its name and hex in light and dark, the type scale in the site's heading, body, and mono styles, and the radius values in use.

#### Scenario: Reading the palette
- **WHEN** a viewer opens the Foundations artboard
- **THEN** each color token appears once, labeled, with its light and dark swatches side by side

### Requirement: Components artboard shows the core components
A Components artboard SHALL show the primary, default, disabled, and large buttons; chips in default and selected state; the AI-engineering, full-stack, product, and tag badges; the tech tag; the Ask Miso launcher; and a project card, each built from the registered tokens.

#### Scenario: Components use tokens
- **WHEN** a component's fill, text, or border color is inspected
- **THEN** it references a registered token and is not a hardcoded hex value

#### Scenario: Selected chip
- **WHEN** the chip is shown in its selected state
- **THEN** it has the sand fill with the on-sand text color, matching `.chip-btn[aria-pressed="true"]`

### Requirement: Page sample proves the parts compose
A Page sample artboard SHALL compose the site header and hero from the Components artboard's parts, at the site's 1200px content width.

#### Scenario: Header and hero
- **WHEN** a viewer opens the Page sample artboard
- **THEN** it shows the brand badge, nav links, the hero name, role, status line, intro, actions, and the Ask Miso launcher, using only registered tokens

### Requirement: Substituted fonts are disclosed
If Geist Sans or Geist Mono is not available to Paper, the file SHALL use Inter and Paper Mono in their place and say so on the Foundations artboard.

#### Scenario: Geist unavailable
- **WHEN** Paper cannot load Geist
- **THEN** the Foundations artboard carries a note naming the substituted fonts
