# 0007 — No business backend

**Status**: Accepted · 2026-10-08

## Context

The usual stack includes Nitro (API routes), Drizzle, Neon, server commands / queries and authentication.

## Decision

Typika has **no business backend**: no database, no accounts, no server commands / queries. The application is a
static build (TanStack Start, hub prerendered for search engines, sandbox as a SPA) plus a single endpoint
`POST /api/github/token` for the OAuth exchange, without storage.

## Consequences

- Trivial hosting (Docker VPS, Vercel or other) — see [hosting](../guides/hosting.md).
- Features that would require shared state (likes, comments, statistics) are excluded or delegated to GitHub.

## Rejected alternatives

- **Full backend on the usual stack**: no V1 use case justifies it.
