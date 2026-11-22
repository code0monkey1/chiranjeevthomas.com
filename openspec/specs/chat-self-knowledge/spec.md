# chat-self-knowledge Specification

## Purpose
Lets visitors ask Miso how it was built (its search flow, caching, failure handling and costs) and get grounded, cited answers, using the site's own engineering write-up: the Miso case study at `/projects/miso-chat` (formerly the post `/blog/how-miso-answers`, which now redirects there).

## Requirements

### Requirement: Miso answers questions about its own design from the write-up
Questions about how Miso searches, caches answers, handles failures or controls cost SHALL be answered from the Miso case study (`/projects/miso-chat`) and SHALL cite it as a source.

#### Scenario: Asking about caching
- **WHEN** a visitor asks "How does Miso cache answers?"
- **THEN** the answer is grounded and at least one source links to the Miso case study (`/projects/miso-chat`)

#### Scenario: Asking about failure handling
- **WHEN** a visitor asks "What happens to the chat if Pinecone goes down?"
- **THEN** the answer describes the keyword-search fallback and cites the Miso case study or the other case-study content it came from

### Requirement: Questions about Miso the cat stay playful
Questions about Miso as a character (who it is, whether it is a real cat) SHALL still be answered briefly and in character without searching. Questions about how the chat works SHALL be searched and cited like any factual question.

#### Scenario: Persona question
- **WHEN** a visitor asks "Who are you?"
- **THEN** Miso answers in character and no search is run

#### Scenario: Question about how the chat works
- **WHEN** a visitor asks "How does this chat find its answers?"
- **THEN** at least one search runs and the answer cites its sources

### Requirement: The write-up does not displace project sources
Adding the write-up SHALL NOT stop existing recruiter questions from reaching the pages they reached before.

#### Scenario: Existing golden questions
- **WHEN** the existing retrieval golden set runs after the case study is published
- **THEN** every case still retrieves a chunk from its expected page

### Requirement: Figures in the write-up are traceable
Every number the write-up states (latencies, token counts, call counts, limits, costs) SHALL come from a recorded measurement, a provider's documented limit, or the code. Miso SHALL NOT present any figure about itself that the write-up or code does not support.

#### Scenario: Reviewing a figure
- **WHEN** a reviewer picks any number in the case study
- **THEN** the change's measurement log names its source (trace, build log, eval run, docs page or code line)

#### Scenario: Asking Miso for a number
- **WHEN** a visitor asks "How fast is a cached answer?"
- **THEN** Miso's answer uses only the figure stated in the write-up, or says the portfolio does not cover it
