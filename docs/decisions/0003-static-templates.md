# 0003 — Static templates in V1

**Status**: Accepted · 2026-10-08

## Context

Two possible models: a template is a fixed project, or it is composed of a base and add-ons (`ts-base + vitest +
effect + cqrs`).

## Decision

In V1, a template is a **static project**. Composition may come in V2 as curated stacks, with declared compatibility
constraints.

## Consequences

- Each template is tested as it is served: the health shown is true.
- Duplication between close templates, accepted.
- The manifest format does not provide for composition; adding it will be an evolution of `schema`.

## Rejected alternatives

- **Free composition**: combinatorial explosion, most combinations would never be tested.
