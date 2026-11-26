# 0025 — The health run drives the app

**Status**: Accepted · 2026-10-12 · slice 6 of M3

## Context

[registry §4.2](../specs/registry.md) requires starting each template "in the same environment as the app", then
running its tests and replaying its exercises. `template-check` already runs a template's tests in Node (V9), but that
is not the path the learner follows: the iframe runtime, cross-origin isolation, loading the files at the pinned ref
and applying the solution are not exercised. The app cannot run Go (M4) or Kotlin (M6) yet, and the dependency tooling
differs for each language.

## Decision

- `registry-tools health <registry> --app <url>` opens each template in Chromium driven by Playwright, on an instance
  of the app. The probe goes through the English interface, like a learner:
  - the boot opens `/play/<name>`, waits for the runtime, then launches Run and waits for exit code 0;
  - the tests expect at least one passing test and no failure;
  - each exercise is opened, its target tests must fail, then "Apply the solution" must solve it.
- A failure is retried once before concluding. A boot that exceeds 20 s makes the template `degraded`.
- The command writes `health/<name>.json`, and `registry-tools build` copies it into the index. `brokenSince` and the
  switch to `deprecated` after 90 days come from the previous state. `deprecated = true` in the registry entry applies
  a team decision on the next run.
- Templates whose runtime the app does not run are skipped: their `health` stays `null`. `deps` is `skip` as long as
  no dependency tooling is plugged in.
- The hub adds a health facet. `healthy` and `degraded` are checked by default, and a template never checked counts as
  healthy for this filter. A `deprecated` template leaves the home page.

## Consequences

- The run targets an app that serves the templates at their pinned ref, like the production build. In development, the
  app reads the templates from disk: that is handy to try a repair, not to judge an entry.
- V9 already refuses at indexing a ref whose tests or exercises fail in Node. The health run catches what V9 does not
  see: a Run that crashes, a browser runtime that regresses, a ref that has become unreadable for the app.
- The probe's selectors depend on the interface's English labels. A production E2E runs it on `strategy-ts`, and on
  variants that must fail.
- A full run takes about ten seconds per healthy template, five minutes for the 34 runnable templates. A broken
  template takes longer: each failing step waits for its timeout, and the run is retried once.
- The `registry/health/*.json` files are committed and rerun by hand until slice 7. From then on, a scheduled CI run
  will produce them in the registry repository, and the files committed here will disappear.
- Deliberate deviation from [registry §5](../specs/registry.md): the banner of a `broken` or `deprecated` template is
  also shown in the `/play/<name>` sandbox, not only on its hub page. A shared link leads straight to the sandbox, and
  the learner must know they are opening a template that is no longer maintained.

## Rejected alternatives

- **Running the tests in Node, like `template-check`**: fast, but checks neither the browser runtime nor loading at the
  pinned ref, which are precisely what breaks without anyone touching the template.
- **A dedicated probe page in the app**: more stable than labels, but it would test a page the learner never opens.
- **Marking Go and Kotlin templates `broken`**: the banner would signal a gap in the app, not in the template.
