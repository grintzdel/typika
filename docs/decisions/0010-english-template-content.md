# 0010 — Template content in English, bilingual interface

**Status**: Accepted · 2026-10-08

## Context

The content of the templates (tours, statements) is most of the text and is written by contributors.

## Decision

- **Interface**: i18n from the start, English and French.
- **Template content**: English only in V1. The format provides for an optional `tour/<locale>/` with fallback to
  English, which can be enabled later.

## Consequences

- A contributor writes once; no translations that drift from the code.
- Barrier for non-English-speaking learners, to reevaluate depending on demand.

## Rejected alternatives

- **Translated tours from V1**: doubles the load of each template, translations that rot.
