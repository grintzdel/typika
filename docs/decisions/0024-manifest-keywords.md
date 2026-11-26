# 0024 — Search keywords in the manifest, without changing the schema

**Status**: Accepted · 2026-10-12 · slice 4 of M3

## Context

The hub's search runs on the index's `search.text` ([registry §3](../specs/registry.md)). This text comes from the
name, the title, the summary, the topics, the tour and the exercises. A learner often searches by the symptom in front
of them, and that word is sometimes missing: "switch" appears nowhere in `strategy-ts`, whose base is a chain of
`if`/`else`. The criterion of slice 4 searches precisely for "switch" and expects `strategy-ts`.

[manifest §10](../specs/manifest.md) requires a new schema version for any added field, with an automatic migration.
Neither the migration nor the CLI exists, and no manifest is published outside this repository before slice 7.

## Decision

- The manifest has an optional `keywords` field: at most 10 lowercase words, 32 characters each, `[]` by default.
  `registry-tools` adds them to `search.text`. They are not repeated elsewhere in the index.
- The schema stays at version 1. Until the first publication outside this repository, schema 1 still accepts optional
  fields. After that, §10 applies without exception.
- The three Strategy templates get `switch`, `if-else`, `conditional` and `polymorphism`. The other templates will get
  some when a word is missing from their search.

## Consequences

- A manifest change enters the index only once the entry is repinned to a commit of `main`
  ([registry §2.4](../specs/registry.md)). Slice 4 is therefore done in two PRs: this field and the Strategy words,
  then the search, which repins the Strategy entries.
- The keywords are in English, like the rest of the manifest. A search in French does not find them.

## Rejected alternatives

- **Schema 2**: a migration and dual support for an optional field, before schema 1 is even published.
- **Keywords in the registry entry**: no repinning, but the words belong to the concept the author writes, not to the
  registry's curation.
- **Changing the criterion's word**: the search would still not find Strategy by its most common symptom.
- **Rewriting the summary**: a template's summary is there to present it, not to list synonyms.
