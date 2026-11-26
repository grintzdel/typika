# 0002 — Kotlin through a compilation service

**Status**: Superseded by [0019](0019-kotlin-runtime.md) · 2026-10-08

## Context

Kotlin is the reference OOP language of the catalog. Its compiler is a JVM program; no official version runs in the
browser.

## Decision

A **stateless compilation service**, based on `kotlin-compiler-server`, compiles the sources to Kotlin/JS or
Kotlin/Wasm. The browser runs the result and the `kotlin.test` tests. The server only compiles.

Safeguards: separate container that can be disabled, no outbound network access, bounded source size, timeout, per-IP
rate limiting, cache by source hash.

## Consequences

- Accepted exception to the principle of [0001](0001-browser-first.md), limited to compilation.
- Kotlin templates do not use JVM-specific APIs (`java.*`).
- An instance without a compilation service hides the Kotlin templates.
- A service to operate, monitor and protect (R9).

## Rejected alternatives

- **`kotlinc` in the browser through a WASM JVM (CheerpJ)**: evaluated in R8; several tens of MB and slow compilation.
  Replaces this decision if R8 finds it acceptable.
- **JVM execution on the server side**: rejected, contrary to [0001](0001-browser-first.md).
