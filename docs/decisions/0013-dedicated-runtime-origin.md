# 0013 — Dedicated origin for execution

**Status**: Accepted · 2026-10-08

## Context

Template code is untrusted: anyone can open a share link containing arbitrary code. The app, for its part, holds the
user's GitHub token and their projects in IndexedDB.

## Decision

The code runs in a **runtime frame served from another origin** (`TYPIKA_RUNTIME_ORIGIN`), loaded in an iframe by the
app and connected through a `MessageChannel`. The app origin never runs user code; the runtime origin holds no secret.

- Public instance: the runtime origin is a **different site** (distinct domain).
- Private instance: a subdomain is tolerated, with a warning.

Details: [security](../specs/security.md) §2, [hosting](../guides/hosting.md).

## Consequences

- A malicious share link can read neither the GitHub token nor the other projects.
- Two domains to configure for a public instance.
- All app ↔ runtime communication goes through an explicit, testable message protocol.
- The embed (R2) must be validated with this architecture of nested iframes.

## Rejected alternatives

- **Execution in workers of the app origin**: a worker shares the storage of the origin (IndexedDB) — a malicious
  template could read the projects and the token.
- **Subdomain required everywhere**: insufficient for a public instance (same-site).
