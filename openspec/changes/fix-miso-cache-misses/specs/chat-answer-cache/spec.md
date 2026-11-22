# Spec Delta

## MODIFIED Requirements

### Requirement: Only trustworthy answers are cached
An answer SHALL be cached (at build time or at runtime) only if it came from the live agent, is grounded, cites at least one source, and does not say the portfolio lacks the information. Answers from the primary model and from the fallback model are both eligible, and each cached entry SHALL record which model wrote it. Retrieval-only answers and error fallbacks SHALL NOT be cached.

#### Scenario: Grounded live answer
- **WHEN** the primary model answers with at least one cited source and the answer is grounded
- **THEN** the answer is eligible for caching

#### Scenario: Rate-limited minute uses the fallback model
- **WHEN** a grounded, cited answer was produced after falling back to the secondary model
- **THEN** it is shown to the visitor and cached, recorded as written by the fallback model

#### Scenario: Not-covered or ungrounded answer
- **WHEN** the answer says the portfolio does not cover the question, or has no sources
- **THEN** it is not cached

## ADDED Requirements

### Requirement: Fallback-model cache entries are upgraded to primary-model answers
A runtime-cache entry written by the fallback model SHALL be served on a hit and then replaced in the background by a primary-model answer when one can be produced. A primary-model entry SHALL NOT be replaced by a fallback-model answer. Background upgrades SHALL be throttled per question and SHALL NOT count against the visitor's own daily limit.

#### Scenario: Repeat question after a rate-limited first answer
- **WHEN** a visitor's first question matches a cached entry written by the fallback model
- **THEN** the cached answer is returned at once as a cache hit, without waiting on the model

#### Scenario: Upgrade succeeds
- **WHEN** a fallback-model entry is hit, its upgrade cooldown has passed, and the primary model then produces a cacheable answer
- **THEN** later hits for that question serve the primary-model answer

#### Scenario: Upgrade still rate-limited
- **WHEN** the background upgrade run also falls back or produces an answer that cannot be cached
- **THEN** the existing entry is kept and no further upgrade is attempted for that question until the cooldown passes again

#### Scenario: Concurrent misses race to write
- **WHEN** a primary-model entry already exists for a question and a fallback-model answer for the same question finishes later
- **THEN** the primary-model entry is kept

### Requirement: Skipped cache writes are diagnosable
When a first-turn live answer is not written to the runtime cache, the server SHALL log the reason, for example the fallback model with a primary entry already stored, not grounded, no sources, not covered, or degraded meaning search. The log SHALL NOT include the visitor's question text.

#### Scenario: Answer rejected by the cache rules
- **WHEN** a first-turn answer fails the caching rules
- **THEN** the function log has one line naming the failed rule and the question's hash key, and no question text
