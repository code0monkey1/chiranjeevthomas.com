# Spec Delta

## ADDED Requirements

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
