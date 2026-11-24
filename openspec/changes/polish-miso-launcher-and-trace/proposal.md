# Proposal

## Why

Recruiters can overlook the Ask Miso launcher on the homepage. Inside the chat, the explanation beneath Agent Trace competes with the trace itself and repeats the purpose of the case-study link in the header.

The homepage also needs a brief first-visit preview of Miso and an email action that opens in browsers without an operating-system mail handler.

## What Changes

- Add a glowing orange bubble that circles the Ask Miso button. Animate the launcher cat with a brief nudge toward the button label.
- Keep the launcher readable and provide a static presentation for visitors who prefer reduced motion.
- Remove the explanatory paragraph and duplicate case-study link from the trace pane. Keep the chat header’s “How I built Miso, and why” link.

- On a first homepage visit, unfold a smaller preview of the chat and fold it back to the launcher.
- Open both Email me buttons in a new Gmail compose tab with the portfolio address filled in.

## Capabilities

### New Capabilities

- `miso-chat-interface` covers the homepage launcher and the chat’s Agent Trace pane.

- `portfolio-contact` covers the homepage email links.

### Modified Capabilities

## Impact

The change touches the launcher, the chat dialog, and their styles. It can use the existing cat artwork and CSS. Verification covers desktop and mobile, motion preferences, keyboard interaction, and the trace before and after a question.
