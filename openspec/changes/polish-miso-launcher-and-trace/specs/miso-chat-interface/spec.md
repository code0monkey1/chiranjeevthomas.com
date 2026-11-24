# Miso Chat Interface

## Purpose

Help portfolio visitors discover Ask Miso and inspect the steps behind its answers.

## ADDED Requirements

### Requirement: The homepage launcher draws attention to Ask Miso

The homepage SHALL provide a clearly labeled Ask Miso button with a glowing orange bubble circling its perimeter and a cat animation that nudges toward the label. The label and supporting text SHALL remain legible throughout the animation.

#### Scenario: Seeing the launcher on a phone or desktop

- **WHEN** a visitor views the homepage with motion enabled
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
