# 0011 — Licenses

**Status**: Accepted · 2026-10-08

## Context

The project is open source. Templates are made to be copied into projects, including proprietary ones.

## Decision

- **Platform** (app, packages, CLI, service): **MIT**.
- **Official templates** (`typika/*`): **MIT-0**, without attribution requirement.
- **Third-party templates**: OSI-approved license chosen by the author, declared in the manifest and shown; the
  registry refuses templates without a license.

## Consequences

- No friction to reuse a template through `typika create`.
- Nothing prevents a third party from hosting a closed version of the platform.

## Rejected alternatives

- **Apache-2.0**: patent clause of little use here, heavier text.
- **AGPL**: protects against a closed SaaS fork but holds back contributions and integrations.
