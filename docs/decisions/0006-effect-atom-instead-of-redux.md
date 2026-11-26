# 0006 — Effect Atom rather than Redux

**Status**: Accepted · 2026-10-08

## Context

The usual stack uses Redux Toolkit, redux-persist and an outbox for local-first, with HTTP gateways injected through
`extraArgument`. In Typika, the hot state is the content of the files and the output of the processes; there is no
server mutation.

## Decision

The UI state is managed by **Effect Atom** (`@effect-atom/atom-react`), plugged directly into the Effect services
provided by Layers on the client side. No Redux, no redux-persist, no outbox; projects are persisted by an IndexedDB
adapter behind a port.

## Consequences

- A single model (Effect) from the runtime to the UI; consistent with effect-form, already in use.
- Frequent updates (typing, output stream) do not go through a serialized global store.
- Accepted gap with the usual frontend rules; presenter hooks and pure components are kept.

## Rejected alternatives

- **Redux Toolkit**: serialization and reducers unsuited to files changed on every keystroke; outbox useless.
- **Zustand / local React state**: does not bring the integration with Effect Streams and Scopes.
