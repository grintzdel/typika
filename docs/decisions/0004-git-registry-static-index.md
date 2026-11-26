# 0004 — Git registry and static index

**Status**: Accepted · 2026-10-08

## Context

The hub must list, classify and describe the templates. A database and an API would be the usual reflex.

## Decision

The registry is a **Git repository**: a PR adds an entry. Its CI resolves the manifests, computes the health and
publishes a static `index.json`. The content of the templates stays in their own repositories. See
[registry](../specs/registry.md).

## Consequences

- No database or API to host; transparent governance (Git history, PR review).
- Publishing a template requires a PR: intended friction, which serves curation.
- The freshness of the index depends on the frequency of the CI.

## Rejected alternatives

- **Database + publication API**: cost, accounts, moderation, with no benefit for a curated catalog.
