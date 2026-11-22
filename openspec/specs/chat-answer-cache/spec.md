# chat-answer-cache Specification

## Purpose
Lets Miso serve previously computed answers instantly and without spending model or search quota, while guaranteeing a cached answer is never staler than the content, prompt, code and model it was produced from.

## Requirements

### Requirement: Suggested questions answer instantly from build-time answers
Each deploy SHALL ship a precomputed answer for every suggested question shown in the chat. Asking a suggested question SHALL show its precomputed answer without a request to the chat API, whether or not the conversation has earlier turns.

#### Scenario: Bubble clicked on a fresh chat
- **WHEN** a visitor clicks a suggestion bubble and a precomputed answer exists for it
- **THEN** the answer and its sources appear without a network request to the chat API

#### Scenario: Bubble clicked mid-conversation
- **WHEN** a visitor has already asked other questions and then clicks a suggestion bubble that has a precomputed answer
- **THEN** the precomputed answer is shown, the same as on a fresh chat

#### Scenario: No precomputed answer for a suggestion
- **WHEN** a visitor clicks a suggestion bubble whose answer could not be precomputed in this build
- **THEN** the question is answered by the live agent exactly as it was before this change

### Requirement: Build-time answers are regenerated on every build
Each build SHALL compute its suggested answers against that build's own content and namespace, after the content has been synced to the search index. A precomputed answer SHALL NOT be carried over from an earlier build.

#### Scenario: Content edited and redeployed
- **WHEN** a project page is edited and the site is rebuilt and deployed
- **THEN** the suggested answers in the new deploy come from an agent run over the edited content

#### Scenario: Precompute fails during build
- **WHEN** the model is unavailable or no model key is configured during the build
- **THEN** the build succeeds, ships no precomputed answer for the affected suggestions, and logs a warning

### Requirement: Only trustworthy answers are cached
An answer SHALL be cached (at build time or at runtime) only if it came from the live agent on the primary model, is grounded, cites at least one source, and does not say the portfolio lacks the information. Retrieval-only answers, error fallbacks and fallback-model answers SHALL NOT be cached.

#### Scenario: Grounded live answer
- **WHEN** the primary model answers with at least one cited source and the answer is grounded
- **THEN** the answer is eligible for caching

#### Scenario: Rate-limited minute uses the fallback model
- **WHEN** an answer was produced after falling back to the secondary model
- **THEN** it is shown to the visitor but not cached

#### Scenario: Not-covered or ungrounded answer
- **WHEN** the answer says the portfolio does not cover the question, or has no sources
- **THEN** it is not cached

### Requirement: Typed first-turn questions are served from a shared runtime cache
A typed question asked with no earlier conversation turns SHALL be answered from the runtime cache when a valid entry exists, for every visitor and every server instance. Questions asked with earlier turns SHALL NOT be read from or written to the runtime cache.

#### Scenario: Repeat of a cached question
- **WHEN** a visitor asks, as the first question of a chat, a question that an earlier visitor's first question already answered and that answer was cached
- **THEN** the cached answer is returned without calling the model or the search index

#### Scenario: Trivially different wording
- **WHEN** the question differs from a cached one only in letter case, surrounding or repeated whitespace, or trailing punctuation
- **THEN** it is treated as the same question

#### Scenario: Follow-up question
- **WHEN** a question is asked with earlier turns in the conversation
- **THEN** the live agent answers it, and the answer is not written to the runtime cache

### Requirement: Runtime cache entries are scoped to the deploy that wrote them
A runtime-cache entry SHALL be served only by the deploy that wrote it. Every new deploy, previews included, SHALL start with an empty runtime cache. Publishing a different deploy, including a rollback, SHALL serve only that deploy's own entries.

#### Scenario: Any new deploy
- **WHEN** a new deploy is published, even one that changes only styling
- **THEN** no answer cached by an earlier deploy is served by it

#### Scenario: Model changed through configuration
- **WHEN** the configured model is changed and the site is redeployed so the change takes effect
- **THEN** no answer cached under the previous model is served

#### Scenario: Deploy preview
- **WHEN** a deploy preview caches an answer over its own edited content
- **THEN** production and other previews never serve that answer

#### Scenario: Rollback to an earlier deploy
- **WHEN** an earlier deploy is published again
- **THEN** it serves only answers that it cached itself

### Requirement: Cache hits are shown honestly in the agent trace
A cached answer SHALL show a trace step that says the answer came from the cache, which cache (build-time or runtime) and how long the lookup took. Any steps from the original run SHALL be labelled as coming from that earlier run.

#### Scenario: Build-time answer shown
- **WHEN** a suggested question is answered from its precomputed answer
- **THEN** the trace begins with a cache-hit step naming the build-time cache, followed by the original run's steps labelled as the earlier run

#### Scenario: Runtime cache hit
- **WHEN** a typed question is answered from the runtime cache
- **THEN** the trace shows a cache-hit step with the lookup time

### Requirement: Cache hits do not count against chat rate limits
An answer served from either cache SHALL NOT count against the per-visitor or global daily chat limits.

#### Scenario: Visitor at the daily limit asks a cached question
- **WHEN** a visitor who has reached the daily limit asks a question with a valid cached answer
- **THEN** the cached answer is returned instead of a rate-limit error

### Requirement: Cache failures degrade to live answers
If the runtime cache is unavailable or a cache read or write fails, the chat SHALL answer through the live agent with no visible error. A cache failure SHALL NOT fail a request.

#### Scenario: Cache store unreachable
- **WHEN** the runtime cache cannot be reached, for example in local development
- **THEN** the question is answered live, the same as before this change

### Requirement: Visitors' raw questions are not stored
The runtime cache SHALL key answers by a hash of the normalised question, and no key or stored field SHALL hold the visitor's question text. The stored trace MAY keep the search queries the model wrote, so a replayed trace stays faithful to the original run.

#### Scenario: Inspecting stored entries
- **WHEN** an operator lists the runtime cache's keys and reads an entry
- **THEN** the key contains only a hash of the normalised question, and no field of the entry is the visitor's question

### Requirement: Answers from a degraded search are not cached
An answer SHALL NOT be cached, at build time or at runtime, unless meaning search ran without error and returned at least one match during that answer's run. This applies even when the answer is grounded and cited.

#### Scenario: Pinecone unavailable
- **WHEN** an answer is produced while Pinecone errors and search falls back to keywords
- **THEN** the answer is shown but not cached

#### Scenario: Deploy rolled back past vector retention
- **WHEN** a rolled-back deploy whose namespace was pruned answers a question from keyword search
- **THEN** the answer is shown but not written to that deploy's runtime cache

#### Scenario: Healthy search
- **WHEN** meaning search returned matches and the answer meets every other caching rule
- **THEN** the answer is cached as before
