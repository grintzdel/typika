# 0030 — Kotlin exercises: their start state is precompiled

**Status**: Accepted · 2026-10-17 · M6 review · slice #98 · complements [0019](0019-kotlin-runtime.md)

## Context

`registry-tools build` precompiles each Kotlin template, without its `exercises/` folder, in `test` and `run` modes
([runtimes §6.4](../specs/runtimes.md)). Opening a template and running its tests therefore costs no call to the
compilation service. An exercise starts from another state: that of the template or its base, plus the `start/`
overlay. Its cache key differs, and the first action on an exercise, running the tests to see them fail, went through
the rate-limited relay ([0029](0029-kotlin-relay-rate-limit.md)).

Measurement on the registry of 2026-10-17: 26 Kotlin exercises, i.e. 52 compilations. 7 already had a template's key,
all in `run` mode on an exercise started from its base. An artifact weighs 250 KB on average.

## Decision

- **`registry-tools build` also precompiles the start state of each Kotlin exercise**, in `test` and `run` modes,
  computed by `exerciseStates` as the app does on opening, with the template's test globs.
- **A key shared by a template and an exercise is requested only once.**
- **An exercise whose base is not in the registry is skipped**: the app then compiles it through the service.
- **Solutions are not precompiled**: applying a solution modifies the project.

## Consequences

- Opening an exercise and running its tests or its program no longer costs any call to the service as long as nothing
  is modified, as for a template.
- 45 more artifacts, 12 MB in `artifacts/kotlin/`. The app only reads the key it requests: the downloaded weight does
  not change.
- A start state must compile. V9 already required it: a start state that does not build makes `template-check` fail.

## Rejected alternatives

- **`test` mode only**: about 5 MB less, but running an exercise's program went through the service again, one more
  exception to explain.
- **Precompiling nothing**: each exercise opening compiles, while its start state is known at build time.
