# chat-vector-index Specification

## Purpose
Keeps the chat's search vectors consistent with the deploy that serves them, so a build in progress, a failed build or a rollback never makes the live chat search content its pages don't show.

## Requirements

### Requirement: Each deploy searches the vectors of its own content
Every Netlify build SHALL sync its content into a namespace identified by its environment and a hash of its indexed content, and the deployed chat SHALL search only that namespace. Local development SHALL keep a single, editable `local` namespace.

#### Scenario: Content edited and deployed
- **WHEN** a build contains edited content
- **THEN** its chat searches a namespace that holds exactly that build's chunks

#### Scenario: Local development
- **WHEN** the site runs under `next dev`
- **THEN** the chat uses the `local` namespace, and content edits reach it on the next question, as before

### Requirement: A build never changes what the live chat searches
A build SHALL NOT add, modify or delete records in any namespace that the currently published deploy searches, unless that namespace holds identical content.

#### Scenario: Build in progress
- **WHEN** a build with changed content is syncing and building
- **THEN** the published deploy's chat keeps returning results from its own content

#### Scenario: Build fails after the sync
- **WHEN** a build syncs new content and then fails
- **THEN** the published deploy's chat still searches its own content, and no namespace is deleted

### Requirement: Unchanged content costs no embeddings
A build whose indexed content matches an existing complete namespace SHALL reuse it without embedding any chunk.

#### Scenario: Styling-only deploy
- **WHEN** a build changes no indexed content
- **THEN** the sync reports 0 chunks upserted and the build bakes in the same namespace as the previous deploy

#### Scenario: Content reverted to an earlier version
- **WHEN** a build's content matches a namespace that still exists from an earlier deploy
- **THEN** that namespace is reused and no chunk is embedded

### Requirement: An incomplete namespace is completed by the next build
A namespace left incomplete by an interrupted sync SHALL be completed, not duplicated, by the next build with the same content.

#### Scenario: Build killed mid-sync
- **WHEN** a build is cancelled after upserting only some chunks and the same content is built again
- **THEN** the second build upserts only the missing chunks and the namespace ends with exactly the corpus's chunks

### Requirement: Old namespaces are pruned only after a deploy is live
After a deploy is published, the system SHALL keep the published deploy's namespace plus the 4 most recently used other namespaces in the same environment, and SHALL delete the rest. Pruning SHALL NOT run when a build fails and SHALL NOT fail or delay a deploy.

#### Scenario: Sixth content version published
- **WHEN** a deploy with a sixth distinct content version is published
- **THEN** the namespace least recently used by a published deploy is deleted, and the 5 remaining include the live one

#### Scenario: Failed build
- **WHEN** a build fails at any step
- **THEN** no namespace is deleted

#### Scenario: Pruning error
- **WHEN** Pinecone rejects a prune request
- **THEN** the deploy stays published and the error is logged

### Requirement: A rollback beyond retention degrades to keyword search
A published deploy whose namespace no longer exists SHALL keep answering, using keyword search over its own content, and its trace SHALL show that meaning search found nothing.

#### Scenario: Rollback to a pruned version
- **WHEN** a deploy is republished after its namespace was pruned
- **THEN** questions are answered from keyword search over that deploy's own content, and nothing in Pinecone is recreated
