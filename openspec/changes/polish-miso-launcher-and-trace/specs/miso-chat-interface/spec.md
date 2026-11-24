# Miso Chat Interface

## Purpose

Help portfolio visitors discover Ask Miso and inspect the steps behind its answers.

## ADDED Requirements

### Requirement: The homepage launcher draws attention to Ask Miso

The homepage SHALL provide a clearly labeled Ask Miso button with a glowing orange bubble circling its perimeter and a cat animation that nudges toward the label. The label and supporting text SHALL remain legible throughout the animation.

#### Scenario: Seeing the launcher on a phone or desktop

- **WHEN** the homepage launcher first comes into view with motion enabled
- **THEN** a glowing orange bubble moves around the button, Miso briefly leans toward “Ask Miso,” and the launcher fits within the viewport

#### Scenario: Reduced motion

- **WHEN** a visitor prefers reduced motion
- **THEN** the glow and cat are static and the launcher remains usable

#### Scenario: Opening and closing the chat with the keyboard

- **WHEN** a visitor activates the focused Ask Miso button and then presses Escape in the dialog
- **THEN** the dialog opens, closes, and returns focus to the launcher

### Requirement: The chat pane is dedicated to Agent Trace

The chat’s right pane SHALL contain only Agent Trace content. The “How I built Miso, and why” link to the case study SHALL remain available in the chat header.

#### Scenario: Opening a new chat

- **WHEN** a visitor opens the chat and views Agent Trace
- **THEN** the pane shows its trace heading and empty state without a “How it works” section or case-study link

#### Scenario: Viewing trace steps on desktop or mobile

- **WHEN** a visitor submits a question and views Agent Trace, using the trace toggle on narrow screens
- **THEN** the pane shows the trace status and any available steps, and the case-study link remains available in the header

### Requirement: First visitors see a compact preview of the chat

The homepage SHALL show a one-time visual preview that unfolds from the launcher, briefly shows the chat as a card smaller than the viewport, then folds back. The preview SHALL leave the page interactive and SHALL be skipped for returning browsers and visitors who prefer reduced motion.

#### Scenario: First visit with motion enabled

- **WHEN** the launcher first comes into view on a visitor’s first homepage visit with motion and browser storage available
- **THEN** a compact preview of the actual chat unfolds and folds back once without taking keyboard focus

#### Scenario: Opening Miso during the preview

- **WHEN** a visitor activates Ask Miso during the preview
- **THEN** the preview gives way to the regular interactive dialog

#### Scenario: Returning, reduced motion, or a direct chat link

- **WHEN** a visitor returns after seeing the preview, prefers reduced motion, or arrives via the direct chat link
- **THEN** the automatic preview is skipped and the regular chat remains available
