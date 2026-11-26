# 0001 — Execution in the browser

**Status**: Accepted · 2026-10-08

## Context

Typika is free and open source. Running users' code on the server side costs compute, attracts abuse (mining, spam,
scans) and requires moderation. It is the main economic risk of a free tool.

## Decision

All template code runs **in the browser**: esbuild-wasm and test runner in a worker for TS / JS, WASM runtime for Go.
The public instance pays for no execution.

## Consequences

- Near-zero hosting cost, offline operation, no abuse surface on the execution side.
- Heavy runtimes to download (R3): lazy-load, cache, CDN.
- No real database: PGlite and SQLite WASM as template dependencies.
- Languages without a browser runtime require either a compilation service ([0002](0002-kotlin-compilation-service.md)),
  or the self-hostable runner (V2).

## Rejected alternatives

- **Server execution (microVMs, containers)**: every language, but cost and abuse incompatible with being free.
- **Hybrid with public server execution**: same problem, on a smaller scale.
