# 0005 — Client-side search and filters

**Status**: Accepted · 2026-10-08

## Context

The usual project rules require every filter to go through a backend request. Typika has no business backend
([0004](0004-git-registry-static-index.md)).

## Decision

The full-text search and the facets of the hub run **on the client side** on `index.json` (MiniSearch or Orama).
Explicit exception to the "no client-side filter" rule.

## Consequences

- Instant search, available offline.
- Valid as long as the index fits in memory (a few hundred entries). Beyond a few thousand, reevaluate (index split by
  facet, or server search).

## Rejected alternatives

- **Search service**: brings back a backend for a volume that does not need one.
