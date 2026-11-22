# blog-post-widgets Specification

## Purpose
Lets blog posts explain systems with interactive and animated diagrams, the same way case studies do, without excluding readers who use reduced motion, assistive technology or no JavaScript.

## Requirements

### Requirement: Posts render widget markers
A post's Markdown SHALL be able to place a named interactive widget with the same `<!-- widget:name -->` marker case studies use. The widget SHALL appear at that position in the rendered post.

#### Scenario: Widget in a post
- **WHEN** a published post contains `<!-- widget:cache-paths -->` between two paragraphs
- **THEN** the post page shows the cache-paths widget between those paragraphs

### Requirement: Unknown widget names fail the build
A post or case study that references a widget name with no implementation SHALL fail the build with an error naming the file and the widget.

#### Scenario: Typo in a marker
- **WHEN** a post contains `<!-- widget:cache-pahts -->`
- **THEN** `npm run build` fails and the error names the post and `cache-pahts`

### Requirement: Animated diagrams respect reduced motion
Every animated diagram in a post, whether a widget or an animated SVG image, SHALL show a complete, static final state when the reader's system requests reduced motion.

#### Scenario: Reduced motion enabled
- **WHEN** a reader with `prefers-reduced-motion: reduce` opens the post
- **THEN** no diagram animates, and every diagram shows all its labels and connections

### Requirement: Diagrams have text alternatives
Every diagram SHALL convey its information without relying on sight: images carry alternative text that states what the diagram shows, and interactive widgets expose their current state as text that updates when the reader interacts.

#### Scenario: Screen reader on an interactive widget
- **WHEN** a screen-reader user selects a different path in the cache-paths widget
- **THEN** the change is announced as text describing that path's steps, latency and LLM calls

### Requirement: Widgets are readable without JavaScript
Every widget SHALL render a meaningful default state in the server-rendered HTML, so a reader without JavaScript, or a crawler, sees its content.

#### Scenario: JavaScript disabled
- **WHEN** the post is loaded with JavaScript disabled
- **THEN** each widget shows its default step or path with its explanatory text

### Requirement: Widgets work on phones
Every widget SHALL fit a 360 px wide viewport without horizontal page scrolling, with controls at least 44 px tall.

#### Scenario: Narrow screen
- **WHEN** the post is viewed 360 px wide
- **THEN** no widget causes horizontal page scroll and every control can be tapped
