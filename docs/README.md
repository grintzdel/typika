# Documentation

## Where to start

1. [Vision](vision.md) — why, for whom, what is in scope and what is not.
2. [Roadmap](roadmap.md) — the milestones and their done criterion.
3. [Decisions](decisions/README.md) — the structural choices and their reasons.

## Product

| Document | Content |
|---|---|
| [Catalogue](specs/catalogue.md) | The 16 initial concepts, their base, tour, exercises and coverage per language |
| [UI](specs/ui.md) | Screens, routes, interactions, accessibility |
| [Registry](specs/registry.md) | Publication, index, health CI, governance |
| [Sharing and CLI](specs/sharing-and-cli.md) | Local persistence, sharing, export, `typika create` |

## Technical

| Document | Content |
|---|---|
| [Manifest](specs/manifest.md) | Normative spec of `typika.toml` |
| [Runtimes](specs/runtimes.md) | `RuntimePort` contract, `browser-js`, `go`, `kotlin` runtimes |
| [Architecture](specs/architecture.md) | Monorepo, modules, data flow, tests |
| [Security](specs/security.md) | Threat model and mitigations |
| [Spikes](spikes.md) | Open questions to settle in M0 |

## Guides

| Document | For |
|---|---|
| [Writing a template](guides/template-authoring.md) | Template authors |
| [Hosting Typika](guides/hosting.md) | Docker, Vercel and other deployments |
| [Contributing](../CONTRIBUTING.md) | Contributors |

## History

[Initial design spec](specs/2026-10-08-typika-v1-design.md): record of the discussions that led to the documents
above. If they diverge, the dedicated documents and the ADRs prevail.
