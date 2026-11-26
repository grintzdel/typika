# 0033 — GitHub organization: `typika-app`

**Status**: Accepted · 2026-11-20 · complements [0014](0014-name-typika.md)

## Context

[ADR 0014](0014-name-typika.md) planned a `typika` organization on GitHub, available on 2026-10-08. All official refs
were therefore written `github:typika/templates/…`, in the manifests, the registry, the code and the specs. On
2026-11-20, when creating it, the identifier is taken: a `typika` organization has existed since 2026-10-12, and it
does not belong to the project.

The app repository can stay under a personal account. The organization is for the public identifiers: the
`github:<owner>/<repo>` refs end up in the index, in the `parent` of exported projects and in the CLI, and changing
them after publication breaks the projects that carry them.

## Decision

- The project's GitHub organization is **`typika-app`**, created on 2026-11-20.
- The official repositories will be `typika-app/templates` and `typika-app/registry`. An official template lives under
  `github:typika-app/` (V4, `E_CATEGORY_MISMATCH`).
- The renaming happens now, before any publication: manifests, registry entries, code, specs and guides. The registry
  entries are pinned again to the commit that renames the manifests, since `base` and `[variants]` resolve against the
  registry keys.
- The project name, the `typika` package, the `@typika/*` scope, `typika.toml` and `typika.dev` do not change.

## Consequences

- Earlier ADRs keep `typika/…`: they describe the state at their date.
- A local project created before the renaming keeps an origin ref in `github:typika/…`, which no longer resolves.
  Nothing is published: there is no migration.
- The Kotlin artifacts are not recompiled: their key depends only on the Kotlin sources.
- The namesake on GitHub is added to the trademark search ([R6](../spikes.md)), which is still to be done. Publication
  still waits for it, along with the reservation of `typika.dev` (#92).

## Rejected alternatives

- **Publishing under `grintzdel/…`**: possible, but the refs would carry a personal account, and a personal repository
  offers neither teams nor intermediate roles for future maintainers.
- **Waiting for R6 to create the organization**: the `typika` identifier was taken in four days. Reserving
  `typika-app` costs nothing and does not commit to the name.
