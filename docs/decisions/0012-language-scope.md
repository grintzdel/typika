# 0012 — Languages: TS, JS, Go, Kotlin

**Status**: Accepted · 2026-10-08

## Context

Several lists were considered (Python, PHP, Java, C#…), each with a different runtime cost.

## Decision

The languages are **TypeScript, JavaScript, Go and Kotlin**. Python, PHP, Java, C# and Rust are out of scope.

## Consequences

- A single really heavy runtime (Go) and a compilation service (Kotlin).
- Kotlin carries the "classic" OOP part that Java or C# would have carried.
- Adding a language later = a runtime + variants, without changing the template format.

## Rejected alternatives

- **Java, C#**: heavy or uncertain browser runtimes; Kotlin covers the same teaching need.
- **PHP, Python**: viable WASM runtimes, rejected as a scope choice.
