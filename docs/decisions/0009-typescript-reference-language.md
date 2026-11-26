# 0009 — TypeScript as the reference language, selective coverage

**Status**: Accepted · 2026-10-08

## Context

Porting the 16 concepts of the catalog to every language multiplies the work without proportional teaching value, and
produces non-idiomatic templates (classic OOP written in Go).

## Decision

- **TypeScript** covers the whole catalog and defines the order and the `id`s of the tour steps that the variants
  follow.
- **Kotlin** covers the whole catalog.
- **JS** and **Go** only cover the concepts where they teach something specific.

Details in [catalogue](../specs/catalogue.md).

## Consequences

- Comparison with TS is always possible.
- A missing variant is an editorial choice, not a gap.

## Rejected alternatives

- **Full coverage in every language**: unmanageable volume, artificial templates.
