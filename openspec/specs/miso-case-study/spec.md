# miso-case-study Specification

## Purpose
Presents Miso, the site's own chat agent, as a project: a case study that explains how it was built and the decisions behind it, an animated card cover, a link to it from the chat itself, and chat answers about Miso that cite it.

## Requirements

### Requirement: Miso has a project case study
The site SHALL publish a case study for Miso at `/projects/miso-chat`, listed in the home Projects grid with a "How it works" link, a live-demo link that opens the chat, and a link to the public source code.

#### Scenario: Visiting the case study
- **WHEN** a visitor opens `/projects/miso-chat`
- **THEN** the page shows Miso's headline, status, tags, tech stack, a "Try the live demo" link to the chat and a "View the code" link to the repository

#### Scenario: Finding Miso in the grid
- **WHEN** a visitor views the Projects section on the home page with the "All" filter
- **THEN** the Miso card appears third, directly after InvoiceChaser, and links to the case study

### Requirement: The case study carries everything the former write-up said
The case study SHALL contain every section, table, figure, widget and measured number from the former post "Making a free-tier RAG agent fast without serving stale answers", with self-references updated from "this post" to the project.

#### Scenario: Comparing against the former post
- **WHEN** a reviewer compares the case study with the last published version of `content/posts/how-miso-answers.md`
- **THEN** every heading's content, every table row, every figure and its caption, all three interactive widgets and every number appear in the case study

#### Scenario: Reduced motion on figures
- **WHEN** a visitor with reduced motion enabled views an animated figure in the case study
- **THEN** the static version of that figure is shown

### Requirement: The case study explains how Miso was built
Beyond the former write-up, the case study SHALL describe how Miso was built: what it is, chunking, semantic search and its score floor, conversation memory, the chat experience (trace, loader), guardrails, evals, and the measured decisions behind them.

#### Scenario: A recruiter looks for the decisions
- **WHEN** a visitor reads the case study
- **THEN** they find a section stating each measured decision (dropping local embeddings, no reranker, unweighted rank fusion, agent query rewriting, Groq model choice), what was measured and why it went that way

#### Scenario: Numbers are current
- **WHEN** the case study states a chunk count or embedding-token figure for the search index
- **THEN** that figure matches the index built from the content in the same deploy

### Requirement: The Miso card has an animated cover
The Miso project card SHALL show an animated how-it-works cover: a question, a search running meaning and keyword lanes that merge, and a cited answer. It SHALL loop, show a complete static frame under reduced motion, have a text alternative and fit the card on phones.

#### Scenario: Default motion
- **WHEN** the home page loads with motion allowed
- **THEN** the Miso card's cover animates the question, the two search lanes merging and the cited answer, then repeats

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** the cover shows every step at once, without animation

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the cover
- **THEN** it announces a description of what the diagram shows

#### Scenario: Phone width
- **WHEN** the card is shown at 360px wide
- **THEN** no cover content is clipped and the page does not scroll horizontally

### Requirement: The chat links to the case study
The chat SHALL show a visible link to `/projects/miso-chat`, available before and during a conversation, so a visitor can open the case study from the chat.

#### Scenario: Opening the case study from the chat
- **WHEN** a visitor opens the chat and activates the "How I built Miso" link
- **THEN** the chat dialog closes and the browser shows `/projects/miso-chat`

#### Scenario: Link fits on phones
- **WHEN** the chat is shown at 360px wide
- **THEN** the link is visible and reachable by keyboard, and the chat bar's controls do not overflow

### Requirement: The old post URL redirects to the case study
The former post SHALL be removed from the Writing list, RSS feed and sitemap, and `/blog/how-miso-answers` SHALL permanently redirect to `/projects/miso-chat`.

#### Scenario: Following an old link
- **WHEN** a visitor or crawler requests `/blog/how-miso-answers`
- **THEN** it receives a permanent redirect to `/projects/miso-chat`

#### Scenario: Writing list and feeds
- **WHEN** the Writing page, `rss.xml` or `sitemap.xml` is generated
- **THEN** none lists `/blog/how-miso-answers`, and the sitemap lists `/projects/miso-chat`

### Requirement: Miso cites the case study for questions about itself
Questions about how the chat works SHALL be searched and SHALL cite the case study. Such a search SHALL be unscoped or scoped to Miso's project, never scoped to a different project.

#### Scenario: Asking about caching
- **WHEN** a visitor asks "How does Miso cache answers?"
- **THEN** the answer is grounded and at least one source links to `/projects/miso-chat`

#### Scenario: Question naming a tool another project also uses
- **WHEN** a visitor asks "What happens to Miso if Pinecone goes down?"
- **THEN** no search is scoped to another project, the answer describes the keyword fallback, and a source links to `/projects/miso-chat`

#### Scenario: Persona questions stay playful
- **WHEN** a visitor asks "Who are you?"
- **THEN** Miso answers in character without searching

#### Scenario: Other projects are not displaced
- **WHEN** the existing retrieval golden set runs after the change
- **THEN** every case still retrieves a chunk from its expected page
