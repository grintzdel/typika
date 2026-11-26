# 0014 — Name: Typika

**Status**: Accepted · 2026-10-08 · formal trademark search to do in M0 ([R6](../spikes.md))

## Context

The project was called Temenos. Temenos AG is a publicly listed banking software vendor: using the same name for a
piece of software exposed the project to a trademark conflict and hurt searching for the project online. The next
name, Palaestra, was already taken as an npm account, which ruled out the `@palaestra` scope.

## Decision

The project is called **Typika**, from the Greek *typos*: the imprint, the model one reproduces, where the word "type"
comes from. A template is exactly that: a model one studies, then reproduces in one's own project.

| Element | Value | Availability on 2026-10-08 |
|---|---|---|
| CLI package | `typika` | Free on npm |
| Package scope | `@typika/*` | No `typika` account or package on npm |
| Domain | `typika.dev` | Free (`typika.io` too) |
| GitHub | `grintzdel/typika` to start, `typika` organization later | No `typika` account or organization |
| Manifest | `typika.toml` | — |
| Environment variables | `TYPIKA_*` | — |

## Consequences

- All the documentation is renamed; the abandoned names only appear in this ADR, the vision, the spikes and the
  initial spec.
- The repository lives under the personal account until the `typika` organization is needed (separate registry and
  template repositories, in M3).
- Reserve the domain and the npm scope before any communication.

## Rejected alternatives

- **Temenos**: trademark risk against Temenos AG.
- **Palaestra** ("training ground"): npm account `palaestra` already taken.
- **Paradeigma**, **Gymnasion**: GitHub accounts already taken; Paradeigma is also long and confused with *paradigma*.
- **Patternhall**: free everywhere, clear, but long and without the depth of the Greek word. First fallback name.
- **Deigmata** ("examples"): free everywhere, but too close to Digma and Denigma, two developer tools.
