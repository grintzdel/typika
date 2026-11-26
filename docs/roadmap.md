# Roadmap

We move step by step: no dates, no launch. Each milestone delivers something usable and ends with a review that decides
the next one. The order below is the current plan, not a commitment.

## Overview

| Milestone | Theme | Usable result |
|---|---|---|
| **M0** | Spikes | The risky technical choices are settled and recorded in ADRs. |
| **M1** | Foundation | Open a local TS template, edit it, run it, run its tests. |
| **M2** | Pedagogy | The catalogue in TS with bases, tours and exercises. |
| **M3** | Hub | Browse, search and open the templates from the registry, with their health. |
| **M4** | Go & comparison | Go variants and TS / Go comparison mode. |
| **M5** | Sharing | Embed, sharing by URL and gist, export, CLI. |
| **M6** | Kotlin | Kotlin variants through the compilation service. |
| **M7** | Publication | The repositories, the instance and the `typika` package are public. |

```
M0 ──► M1 ──► M2 ──► M3 ──┬──► M4 ──► M6 ──┬──► M7
                          └──► M5 ─────────┘
```

M4 and M5 are independent; M6 depends on M4 (comparison mode). M7 publishes what the others delivered.

---

## M0 — Spikes

**Goal**: remove the unknowns that could invalidate the architecture before writing lasting code.

Deliverables:

- Spikes R1, R2, R4, R7, R8 run according to [spikes](spikes.md): throwaway prototypes, outside the monorepo.
- One ADR per decision made ([decisions](decisions/README.md)).
- The first template written **on paper** (Strategy in TS: base, tour, `refactor` exercise) to validate the
  [manifest](specs/manifest.md) format on a real case. It serves as test data for the spikes and for M1.
- Formal trademark search on "Typika" (R6, [ADR 0014](decisions/0014-name-typika.md)).

Done when: each spike has a written conclusion (go / no-go / plan B) and the manifest is frozen at `schema = 1`.

Status (2026-10-08): R1, R2, R4, R7 and R8 are concluded, and the [manifest](specs/manifest.md) is frozen at
`schema = 1`. R6 remains.

## M1 — Foundation

**Goal**: the basic loop works end to end for a TS template.

Deliverables:

- Monorepo (pnpm, Turborepo, oxlint, oxfmt, Vitest, Playwright): see [architecture](specs/architecture.md).
- `packages/manifest`: Effect schema, TOML parser, ref resolution, validation errors.
- `packages/runtime-core`: `RuntimePort` and normalized test events: see [runtimes](specs/runtimes.md).
- `packages/runtime-browser-js` and `packages/test-runner`.
- `apps/web`: minimal sandbox (file tree, CodeMirror 6 editor, console, tests panel), projects in IndexedDB, reset.
- Docker image and COOP/COEP header configuration, checked by an E2E test: see [hosting](guides/hosting.md).
- The Strategy template from M0, real and green.

Done when: we open the Strategy template, change it, run its tests, reload the page, and the changes are still there.

Status (2026-10-09): the monorepo, `packages/manifest`, `packages/runtime-core`, `packages/test-runner` (with its
conformance suite against Vitest) and `packages/runtime-browser-js` (tested in Chromium with the Strategy template) are
delivered. The `browser-js` preview waits for a template that needs it.

Status (2026-10-10): `apps/web` opens a template from the repository at `/play/<name>`: file tree, CodeMirror editor,
Run and Tests executed in the runtime frame, on a separate, isolated origin. Remaining: persisting projects in
IndexedDB and reset, the Docker image with the headers E2E test, and the editor's TypeScript language service.

Status (2026-10-11): projects are persisted in IndexedDB. Changing a template creates its local project, reloading the
page reopens it, and Reset restores the template's files after confirmation: the M1 completion criterion is met.
Remaining: the Docker image with the headers E2E test, and the editor's TypeScript language service.

Status (2026-10-11): the Docker image serves the app and the runtime frame from a Node server that sets the headers per
host and per path, behind Caddy for TLS and HSTS. The production E2E suite checks the headers of each route and runs a
template under the real CSP, against the local build as well as against the image. Remaining: the editor's TypeScript
language service.

Status (2026-10-11): the editor has its TypeScript language service in a worker: completion with auto-import,
multi-file diagnostics, hover and signature help, enabled as soon as the worker is ready. M1 is delivered.

Review (2026-10-11): we move to M2 as planned. M3 only makes sense with a catalogue to publish, and M4 as well as M5
come after M3. What remains open after M1:

- If you type before the TypeScript worker is ready, completion only opens on the next keystroke, and no indicator
  shows that the worker is starting. Both points are fixed in the first slice of M2, since tours and exercises make
  people type as soon as they open.
- The trademark search on "Typika" (R6) is not done. It must be done before any public release.
- Isolation has only been checked in Chromium (R2, R7, R8). Firefox and Safari are to be checked by M4 at the latest.
- The Vercel configuration, `SECURITY.md` and GitHub CI are still pending: the pre-merge check is local.

## M2 — Pedagogy

**Goal**: what sets Typika apart from a sandbox exists.

Deliverables:

- Guided tours (panel, highlighting, sync with the editor).
- "Diff since the base" view.
- `fix` and `refactor` exercises: start state, progress, validation, solution.
- The 16 concepts of the [catalogue](specs/catalogue.md) in TS, and the planned JS variants.
- [Template authoring guide](guides/template-authoring.md) proven on these 16 templates.

Done when: each TS template of the catalogue has a base, a complete tour and at least one `refactor` exercise, and its
tests are green.

### Breakdown

One slice = one `m2/<slice>` branch and one PR. Slices 2 to 4 build the interface on `strategy-ts`, which already has
its tour and its two exercises. Slice 5 provides tooling to check templates. Slice 6 writes the rest of the catalogue
relying on that tool.

| # | Slice | Content | Done when |
|---|---|---|---|
| 1 | `language-service-startup` | A completion requested before the worker is ready opens when it is. A discreet indicator shows that TypeScript is starting. | An E2E test types right after opening and gets the completion without a second keystroke. |
| 2 | `tour` | Tour panel ([ui §7](specs/ui.md)): Markdown rendering without raw HTML, Previous / Next navigation and navigation through the list, opening the anchored file, `lines` or `region` highlighting without the markers, `also` tabs, `#step=<id>` in the URL, `Alt+←` / `Alt+→`, `aria-live` announcement. If the code has changed, the step says so and opens the original read-only. `tour/` and `typika.toml` are grouped and read-only in the tree. A `typika:<name>` link opens `/play/<name>` when the template is bundled. | The `strategy-ts` tour can be walked through entirely with the keyboard, and a step reloaded from its URL reopens the right file on the right range. |
| 3 | `diff` | Diff tab ([ui §6.4 and §8](specs/ui.md)): "Since the base", restricted to `base.focus`, and "My changes". Side-by-side and unified views, `+` / `-` signs, markers toward the tour steps, "Open the base" button. The template source resolves `[base]` refs to the bundled templates. | The `strategy-base-ts` → `strategy-ts` diff shows the files of `src/checkout/` and links to the anchored steps. |
| 4 | `exercises` | `/play/<name>?exercise=<id>` ([ui §10](specs/ui.md), [manifest §6](specs/manifest.md)): start state (`from`, `start/` overlay, `.typika-remove`), one local project per exercise, Exercise panel (instructions, target tests, progress), validation on each test run, success remembered locally, hints one at a time, solution (per `solutionFrom`) shown as a diff then applied on request, Start over. The computation of start and solution states lives in a package, to be reused by slice 5. | The two `strategy-ts` exercises are solved end to end in E2E. |
| 5 | `template-check` | A command checks each template of `templates/`: valid manifest, `[base]` and `[variants]` refs resolved, tour anchors present, then the rules of [manifest §6.4](specs/manifest.md) (start red on the `failing` files only, solution entirely green). It is part of the local check and prefigures the `packages/registry-tools` of M3. | `strategy-ts` passes, and a deliberately broken exercise makes the command fail. |
| 6 | `catalogue-*` | The 15 remaining concepts in TS, their bases and the 3 JS variants, in waves: (a) Observer, Decorator, Factory Method, Adapter, composition vs inheritance; (b) the five SOLID principles; (c) `naive-crud-ts` then the five architectures; (d) `observer-js`, `decorator-js`, `composition-over-inheritance-js`. The first wave replaces the `/` redirect with a simple list of the bundled templates, until the M3 hub. Each wave updates the [authoring guide](guides/template-authoring.md) with what it learned. | The M2 completion criterion above, checked by the slice 5 command. |

To be decided during the slices, with an ADR if a dependency comes in: the tour's Markdown rendering (slice 2) and the
diff engine (slice 3, `@codemirror/merge` as the first candidate since the editor is CodeMirror 6). In slice 6, we also
need to check that the language service and the `browser-js` runtime handle a JS template as well as a TS template.

Status (2026-10-11): slices 1 to 5 delivered. The toolbar shows that TypeScript is starting, or that it is
unavailable, and a word typed before the worker is ready opens its completion as soon as it is. The Tour panel walks
through the `strategy-ts` steps, opens the anchored files in editor tabs and highlights their range; the Markdown
rendering is settled by [0020](decisions/0020-tour-markdown.md). `Alt+←` / `Alt+→` change step outside the editor
only, because CodeMirror already uses them on macOS (previous / next word). The Diff tab of the side panel lists the
files changed since the base (restricted to `base.focus`) or since the template, and opens them in a side-by-side or
unified diff in the editor ([0021](decisions/0021-diff-engine.md)).
`/play/<name>?exercise=<id>` opens a local project specific to the exercise, on its start state, computed by
`exerciseStates` in `@typika/manifest` so that slice 5 reuses it. The Exercise panel tracks the target tests on each
run, remembers success in the browser's `localStorage`, reveals hints one at a time, shows the solution in the Diff
tab, then applies it on request. "Start over" is the toolbar's Reset button, which returns to the exercise's start
state.
`pnpm template-check` (package `@typika/template-check`) validates each template of `templates/`, resolves the official
`[base]` and `[variants]` refs to the local folders, and runs the `browser-js` exercises in Node with the sandbox's
bundler and runner, so that the command and the sandbox judge a template the same way. Go and Kotlin exercises are not
run yet: their runtimes only run in the browser or behind the compilation service.

Slice 6, wave (a) delivered: `observer-ts`, `decorator-ts`, `factory-method-ts`, `adapter-ts` and
`composition-over-inheritance-ts`, with their base, their tour and their exercises. `/` lists the bundled templates
(title, summary, language, level; bases are hidden) until the M3 hub. `template-check` now runs every test file on
every run: a file with unchanged code used to disappear from subsequent runs.

Wave (b) delivered: the five SOLID principles (`single-responsibility-ts`, `open-closed-ts`, `liskov-substitution-ts`,
`interface-segregation-ts`, `dependency-inversion-ts`), each with its base, its tour and its exercises. Each base shares
its test suite with its template; the template only adds tests that target its structure.

Wave (c) delivered: `naive-crud-ts`, the common base, and the five architectures (`hexagonal-ts`, `cqrs-ts`,
`event-sourcing-ts`, `outbox-ts`, `state-machine-ts`), each with its tour and its two exercises. The base exposes in
`openShop` a simulated HTTP handler and the infrastructure fakes (`cards`, `broker`, `mailer`, `clock`); its tests go
through them, so each architecture reuses them as is.

Wave (d) delivered, and with it slice 6: `observer-js` and its base, where `EventTarget` plays the role of the subject
and an `AbortSignal` that of unsubscription; `decorator-js`, where a notifier is a function and each decorator a
higher-order function; `composition-over-inheritance-js`, whose base shows `class` as sugar over the prototype chain
and whose template shows a factory function that keeps its parts in its scope. The language service now analyzes the
`.js` files of a project without `tsconfig.json`, and `template-check` ignores a test's uncaught errors, like the test
worker.

Review (2026-10-12): M2 is delivered. The 16 concepts of the catalogue have their TS template, each with its base, a
tour of 5 or 6 steps and a `refactor` exercise, plus a `fix` exercise for 10 of them. `pnpm template-check` passes on
the 38 templates, exercises included. The command does not check that a `refactor` exercise exists: this point was
checked by hand, and moves into V9 in M3. The three JS variants are delivered. The authoring guide was revised at each
wave. We move to M3 as planned, because M4 and M5 assume a registry. What remains open:

- The trademark search on "Typika" (R6) is not done. M3 creates the first public repositories: it must be done
  before.
- Isolation has only been checked in Chromium (R2, R7, R8). Firefox and Safari remain to be checked by M4 at the latest.
- The Vercel configuration, `SECURITY.md` and GitHub CI are still pending. CI becomes necessary in M3, since the
  registry validates PRs and computes health in GitHub Actions.
- `ui.md` names the template page `/templates/<name>`, and `architecture.md` names it `/t/$templateId`. Slice 3 of M3
  decides.

## M3 — Hub

**Goal**: templates live in a registry, not in the app's code.

Deliverables:

- Registry repository, `packages/registry-tools` (`index.json` generation, health CI): see
  [registry](specs/registry.md).
- Renovate on the `typika-app/*` repositories.
- Prerendered hub pages: home, faceted list, template page: see [ui](specs/ui.md).
- Client-side search over the index.
- Interface in English and French.

Done when: adding a template is done through a PR to the registry, without touching the app, and its health status
appears on the hub.

### Breakdown

One slice = one `m3/<slice>` branch and one PR. Slices 1 to 6 stay in this repository: `templates/` plays the role of
`typika-app/templates` there, and a local registry folder that of `typika-app/registry`. Only slice 7 creates
repositories on GitHub. It requires decisions that are not technical: the GitHub organization
([0033](decisions/0033-github-org-typika-app.md)), public visibility, and the trademark search (R6).

| # | Slice | Content | Done when |
|---|---|---|---|
| 1 | `registry-tools` | `packages/registry-tools` ([registry §1 to §3](specs/registry.md)): schema of the entry files, validations V1 to V10 (reusing `@typika/template-check`, plus the "at least one `refactor` exercise" rule for principles and design patterns), generation of `index.json` and of its JSON schema. Variants are resolved to names. `@<sha>` refs are resolved to a local folder, until slice 7. | A local registry that references the 38 templates produces a valid `index.json`, under 500 KB compressed. A broken entry (duplicate name, unpinned ref, missing `refactor` exercise) makes the command fail. |
| 2 | `index-source` | The app reads the index at the `TYPIKA_REGISTRY_INDEX_URL` URL ([hosting](guides/hosting.md)) and loads a template's files from its pinned ref, with a cache. A GitHub adapter replaces the `bundled` adapter in production. The `bundled` adapter stays for tests and development. Cross-cutting loading and error states ([ui §2](specs/ui.md)). A local project keeps its origin ref ([registry §6](specs/registry.md)). | `/play/<name>` opens a template served by a test registry (index and files on a local server), without the template being bundled. |
| 3 | `hub-pages` | Hub pages prerendered from the index ([ui §3 to §5](specs/ui.md), [architecture §4](specs/architecture.md)): the home page with one card per concept and "Resume", the faceted list whose filters live in the query string, and the template page with its language selector, its tour, its base, its exercises and its variants. The slice decides the template page route, then aligns `ui.md` and `architecture.md`. | The three pages are readable without JavaScript in the production build. A filtered list URL, reloaded, restores its filters. |
| 4 | `search` | Client-side full-text search on the index's `search.text`, combined with the facets, with counts per value, sorting and empty state ([ui §4](specs/ui.md)). `/` shortcut. An ADR if a dependency comes in. | An E2E test searches for "switch", filters on `typescript` and finds `strategy-ts`. A filter with no result shows the empty state and removes its filters one by one. |
| 5 | `i18n` | The `en` and `fr` resources already exist, and the language is detected from the browser. The slice adds the language menu, local persistence, date and number formatting per language, and the "content in English" label on the template page ([ui §17](specs/ui.md)). No hard-coded string in the new hub pages. | Changing the language in the menu translates the hub and the sandbox, and the choice survives a reload. A test checks that each `en` key exists in `fr`. |
| 6 | `health` | The health run of [registry §4.2 and §4.3](specs/registry.md) becomes a `registry-tools` command. It starts each template in Chromium driven by Playwright, runs its tests, replays its exercises and writes `health/<name>.json`, which the index includes. The hub shows the `degraded` badges, and the `broken` and `deprecated` banners ([ui §2](specs/ui.md)). | A deliberately broken template turns `broken` and its banner shows. A restored template becomes `healthy` again. |
| 7 | `registry-repos` | The trademark search (R6) and agreement on the GitHub organization come first. Then: creation of `typika-app/templates`, where `templates/` moves with its history, and of `typika-app/registry`, with the `validate-pr`, `build-index` and `health` workflows, `CODEOWNERS` and `maintainers.toml`. Renovate is enabled on both repositories. Publishing the index triggers the app rebuild ([hosting](guides/hosting.md)). | The M3 completion criterion: a PR to the registry adds a template without touching the app, and its health appears on the hub after deployment. |

Status (2026-10-12): slice 1 delivered. `packages/registry-tools` checks the local registry `registry/`, which has one
entry per template (38) and the vocabulary of the 16 topics. It reads each template at its pinned commit, applies V1 to
V7, V9 and V10, then writes `index.json` (`pnpm registry:build`, 7 KB compressed) and its JSON schema. The registry
error codes are added to `@typika/manifest`. A change to a template only enters the index once its entry is re-pinned,
as [registry §2.4](specs/registry.md) specifies. In slice 7, extracting `templates/` changes the SHAs: all entries will
be re-pinned.

Slice 2 delivered. The app reads the index at `TYPIKA_REGISTRY_INDEX_URL`, then a template's file list and files at its
pinned ref, through two URL patterns in the jsDelivr format ([0022](decisions/0022-template-files-source.md)), with an
in-memory cache per ref. Until slice 7, the build writes the index and a mirror of the templates
(`registry-tools mirror`) into `dist/client/registry/`, and the default values point to it: `.git` enters the Docker
context. The `bundled` adapter is now only used in development and in unit tests; it is absent from the production
bundle. A local project records the ref it comes from, and its diff and its reset keep it when the index moves forward.
The home page and the sandbox show skeletons while loading, and an error that names its cause, with "Retry" when it is
transient. The production E2E serves the mirror from another origin, opens `/play/strategy-ts` and checks that no
template is in the bundle.

Slice 3 delivered. The template page is at `/templates/$name`, and `ui.md` and `architecture.md` are aligned
([0023](decisions/0023-hub-prerendering.md)). The build prerenders the home page, the list and the 21 template pages
from the build's index. A Vite plugin builds it with `registry-tools` and provides it to the server as a virtual module:
no index enters the client bundle. The home page shows one card per concept, grouped by category, and "Resume" lists
the three most recent local projects. The list filters by topic (category then family), language, paradigm, level,
framework, library, use case and category; its filters live in the query string and apply after hydration. It has an
empty state that removes its filters one by one. The template page shows its tour, its base with a link to the diff
(`/play/<name>?panel=diff`), its exercises and its variants. The server serves each prerendered page with a CSP that
allows its own inline scripts. The HTML is in English, and the browser language applies after hydration. The
production E2E reads the three pages without JavaScript, reloads a filtered list and checks that hydration raises no
error.

Slice 4 delivered, in two PRs. The first adds an optional `keywords` field to the manifest, included in `search.text`,
without changing the schema version as long as nothing is published ([0024](decisions/0024-manifest-keywords.md)): the
three Strategy templates get `switch` in it. The second re-pins their entries and adds search to the hub. The header
field searches from every page, `/` puts focus on it, and without JavaScript it submits a form to the list. Each typed
word must start a word of `search.text`. The list shows, for each facet value, the number of results it would give,
disables those at 0, and sorts by relevance, catalogue order or update date (`?q=` and `?sort=`). The empty state also
removes the search. No dependency came in: 21 templates are searched by walking the index.

Slice 5 delivered. A language menu is in the hub header and in the sandbox toolbar. The choice is kept locally and takes
precedence over the browser language on reload. The menu is disabled until hydration, so that a choice made too early
is not lost. Prerendered pages stay in English, and the chosen language applies after hydration. Counts and durations
are formatted per language. The template page shows its update date and, in a language other than English, says that
template content is in English. A test checks that each `en` key exists in `fr`, and an E2E changes the language on
the hub and in the sandbox, then reloads the page.

Slice 6 delivered ([0025](decisions/0025-health-run.md)). `pnpm registry:health --app <url>` opens each template in
Chromium on an instance of the app. It starts Run, then the tests, and replays each exercise up to "Apply the
solution". A failure is retried once, then the status is written to `registry/health/<name>.json`, and
`registry:build` puts it in the index. The 34 TypeScript and JavaScript templates are `healthy`; the four Go and Kotlin
templates are skipped as long as the app does not have their runtime. The hub shows a badge on the cards and the
template page, a red `broken` banner on the page and in the sandbox, and a `deprecated` banner with "See
alternatives". The list has a health facet, and a `deprecated` template leaves the home page. The criterion was played
on the production build: `strategy-ts` pinned on a throwaway commit whose Run crashes turns `broken` and shows its
banners, then becomes `healthy` again once the pin is restored. Such a commit passes V9, since its tests stay green:
that is what the health run adds to indexing. The production E2E runs the probe on `strategy-ts`, then on an exercise
and a template that cannot be found.

Slice 7 ready, publication pending. `registry-tools` reads a templates repository from a local clone (`--checkout`).
The extraction of `templates/` and `registry/` into repositories, their workflows and the branch that wires them in as
submodules are prepared locally, with the gate green, without publishing anything. Publication waits for the trademark
search (R6) and the reservation of `typika.dev`; the `typika-app` organization has existed since 2026-11-20
([0033](decisions/0033-github-org-typika-app.md)). The M3 completion criterion goes through this public registry: M3
stays open until then. Nothing blocks M4, which keeps the templates in this repository. A template changed in the
meantime is carried over by rerunning the extraction and rebasing the branch.

## M4 — Go & comparison

**Goal**: the second language and comparison, the core of the lesson "the language is part of the pattern".

Deliverables:

- `packages/runtime-go`: Go toolchain in WASM and build driver ([0018](decisions/0018-go-runtime.md)).
- Go variants planned in the catalogue.
- Comparison mode: two variants side by side, synchronized by tour step.

Done when: we compare Strategy in TS and in Go step by step, and the Go variant shows why the pattern comes down to a
function there.

### Breakdown

One slice = one `m4/<slice>` branch and one PR. Slices 1 and 2 bring the `go` runtime: first the build driver, tested
against native `go test`, then its integration into the app. Slice 3 does not need the runtime: comparison shows
read-only code and a tour, and `strategy-go` already exists. Slice 4 writes the Go variants of the catalogue relying on
the first three.

| # | Slice | Content | Done when |
|---|---|---|---|
| 1 | `runtime-go-driver` | `packages/runtime-go` ([0018](decisions/0018-go-runtime.md)): a script rebuilds the assets from the pinned Go version (`compile.wasm`, `link.wasm`, precompiled stdlib, BSD license). The driver does the work of `go build` and `go test`: package graph, `importcfg`, `_testmain.go`, archive cache by hash, `test2json` conversion to `TestEvent` ([runtimes](specs/runtimes.md)). A conformance suite compares its results to those of native `go test`. An import outside the precompiled set has its error code, and `template-check` runs the tests of Go templates. | On `strategy-go` and the four states of its exercises, the conformance suite gives the same greens, reds, messages and `file:line` as `go test`. The assets weigh at most 12 MB in brotli. |
| 2 | `runtime-go-app` | The `go` runtime in the app: worker, progress bar for the first load, asset caching by Service Worker (R3, an ADR), stopping an infinite loop and restarting, compilation errors located in the editor, Go highlighting. The health run covers Go templates. | `/play/strategy-go` starts Run, the tests and the two exercises in Chromium and WebKit. A reload does not download the assets again. `strategy-go` and `strategy-base-go` are `healthy`. |
| 3 | `compare` | `compare` module and `/compare/<name>?a=<lang>&b=<lang>` page ([ui §9](specs/ui.md), [manifest §5.3](specs/manifest.md)): two read-only columns, a shared tour synchronized by step id, grayed-out column with the variant's text when a step is missing on one side, `Alt+←` / `Alt+→`, one column at a time with a toggle on mobile, "Open in the sandbox" per column. The template page's "Compare" button becomes active. The slice decides between `/compare/<name>` and the `/compare?left=…&right=…` of `architecture.md`. | An E2E compares `strategy` in TS and in Go step by step: each step opens, in both columns, the range it anchors. A step missing on one side shows its state. |
| 4 | `catalogue-go` | The Go variants planned in the [catalogue](specs/catalogue.md), with their bases, one PR per concept and per wave. (a) Fundamentals and principles: `composition-over-inheritance-go`, `interface-segregation-go`, `dependency-inversion-go`. (b) Design patterns: `decorator-go`, `adapter-go`. (c) Architectures: `naive-crud-go`, then `hexagonal-go`, `cqrs-go` and `outbox-go`. Each tour reuses the ids of the TS variant. The authoring guide gets a Go section. | The 9 Go variants are in the registry, `healthy`, and compare to their TS variant without `W_TOUR_ORDER_DIVERGES`. |

The M4 completion criterion is played at the end of slice 3. Firefox and Safari (R2, R7) are checked by hand during the
M4 review.

Status (2026-10-12): slice 1 delivered. `packages/runtime-go` rebuilds the assets with the local Go
(`pnpm --filter @typika/runtime-go build:assets`): 11.9 MB in brotli with Go 1.24.5, including a stdlib of 76
packages. `regexp` was taken out of it to stay under 12 MB: `-test.run` therefore looks for a substring. The driver
runs on an in-memory FS plugged in under the API that `wasm_exec.js` expects, compiles and links each package with a
cache by hash, generates the `_testmain.go`, and converts the output with a port of `test2json`. The conformance suite
compares its events to those of native `go test -json`: subtests, external tests with `TestMain`, goroutines, panic,
`TestMain` that exits, compilation errors, and `strategy-go` with its base, the `run` and the four states of its
exercises. The greens, the reds, the messages, the `file:line` and the outputs are identical. Under Node,
`strategy-go` passes its tests in 0.65 s, then in 0.12 s with the cache. `template-check` runs the Go exercises and
refuses an import outside the set (`E_GO_IMPORT_UNAVAILABLE`). `registry-tools` does not do so yet: it runs in the app
build, which will only have the Go assets in slice 2.

Status (2026-10-12): slice 2 delivered. `/play/strategy-go` runs Run, the tests and the two exercises in Chromium and
WebKit. The runtime runs in a worker kept for the session; Stop or the watchdog terminates it, and the next run creates
a new one. The toolbar shows the asset download and a Stop button. A build error is underlined in the editor, and
`.go` files are highlighted. The assets are built in the Docker image, served in brotli and kept in Cache Storage
rather than by a Service Worker ([0027](decisions/0027-go-assets-delivery.md)): a reload does not download them again.
The TypeScript language service no longer starts for a Go template. `registry-tools` runs the Go exercises at indexing
(V9, V11), and `strategy-go` as well as `strategy-base-go` are `healthy`.

Status (2026-10-12): slice 3 delivered. `/compare/<name>?a=<lang>&b=<lang>` is chosen over the
`/compare?left=…&right=…` of `architecture.md`, which is updated: it follows [ui §9](specs/ui.md) and keeps the concept
name in the URL. The `compare` module loads both variants from the index and the registry files, aligns the tours by
step id, and reuses the read-only editor, the tabs and the tour navigation (`Alt+←` / `Alt+→`, `#step=`). A step
missing on one side grays out the column with "This step has no equivalent in <language>". The template page offers
"Compare with <language>" for each variant in the index; `strategy-kotlin` is among them, and so already compares
read-only before its runtime (M6). The E2E walks through Strategy in TS and in Go step by step and checks the range
opened in each column. No template is missing a step yet: the E2E removes a step from the Go manifest on the fly to
cover this case.

Status (2026-10-12): slice 4, wave (a) delivered. `composition-over-inheritance-go`, `interface-segregation-go` and
`dependency-inversion-go` are in the registry with their bases, `healthy`, and compare to their TS variant without
`W_TOUR_ORDER_DIVERGES` (#46, #47, #48). The composition base chains embedded structs behind a `Product` interface,
and its tour shows that embedding promotes methods without creating a subtype or late binding. In the ISP, `payments`
no longer declares any interface: each client declares its own, with one method. In the DIP, `checkout` declares
`Notifier` and `OrderRepository` and `memstore` imports `checkout`. The DIP exercise reveals a constraint specific to
Go: a test that calls an API absent from the base does not compile, so `start/` declares that API with a body that
ignores its arguments. The authoring guide adds this to its Go section (§8.3).

Status (2026-10-12): slice 4, wave (b) delivered. `decorator-go` and `adapter-go` are in the registry with their bases,
`healthy`, and compare to their TS variant without `W_TOUR_ORDER_DIVERGES` (#51, #52). The Go decorators are structs
that embed the `Notifier` they wrap, like an `http.Handler` middleware; the tour explains what embedding forwards, and
the risk of a method forwarded without the decorator's behavior. The Go adapter satisfies `payments.Gateway`
implicitly, checked by `var _ Gateway = (*LegacyPayAdapter)(nil)`. The simulated SDK lives in `internal/legacypay`,
not under `vendor/`. The tests that spied on the SDK in TS check what it holds. The two `refactor` exercises apply the
guide's Go rule: `start/` declares the new API with a body that has no effect.

Status (2026-10-12): slice 4, wave (c) delivered, slice 4 done. `naive-crud-go`, `hexagonal-go`, `cqrs-go` and
`outbox-go` are in the registry, `healthy`, and compare to their TS variant without `W_TOUR_ORDER_DIVERGES` (#55, #56,
#57): the 9 Go variants of the catalogue are there. Since `net/http` is not in the precompiled set, the base simulates
HTTP with JSON bodies. In `hexagonal-go`, the core declares its driven ports and `*Service` is the driving port: each
driving adapter declares the interface it calls. In `cqrs-go`, a command is a struct handled by a method, without a
bus, and the read models are maps. In `outbox-go`, the relay publishes after each write and `Run` restarts it in a
goroutine stopped by a `context`. Remaining: the M4 review, with Firefox and Safari checked by hand.

Review (2026-10-12): M4 is delivered. The `go` runtime compiles and tests in the browser, with results identical to
native `go test`. The 9 Go variants of the catalogue are in the registry, `healthy`, and compare step by step to their
TS variant. Strategy in TS and in Go plays the completion criterion. The index has 52 entries. The full check is green,
with 70 E2E in dev and 35 in production. The Go runtime is covered in Chromium and in Playwright's WebKit, and Safari
is checked by hand on the production build. We move to M6 rather than M5: M6 is built locally like M4, whereas the
gist, `npx typika create` and the embed in a third-party page assume a public deployment, blocked like slice 7 of M3.
What remains open:

- Firefox is not checked (R2, R7, R8). Playwright's Firefox (build 1555) does not start under macOS 27, even in
  windowed mode, and no Firefox is installed on the development machine. The check moves to M6, which adds one more
  runtime.
- M3 stays open: publication waits for the trademark search (R6), the `typika` organization and `typika.dev`.
- The Vercel configuration, `SECURITY.md` and GitHub CI are still pending. The Kotlin service makes them more pressing:
  it is the first component that runs a compiler on untrusted code.

## M5 — Sharing

**Goal**: take the templates out of Typika.

Deliverables (see [sharing-and-cli](specs/sharing-and-cli.md)):

- Embed `/embed/<name>` and copyable snippet.
- Sharing by URL, sharing by gist (GitHub OAuth).
- Zip export, push to a new GitHub repository.
- `typika create` and `typika validate` CLI.

Done when: a template is embedded in a third-party page and runnable, and `npx typika create strategy-ts` produces a
project that passes its tests outside Typika.

### Breakdown

One slice = one `m5/<slice>` branch and one PR. As long as publication waits on #92, there is no public instance and no
npm package: slices 1 to 5 are built and tested locally, like M4 and M6. A third-party page is simulated with a host
served on another origin, as in spike R2. Today, a local project corresponds to a template or to an exercise. Sharing
requires independent projects: slice 1 brings them.

| # | Slice | Content | Done when |
|---|---|---|---|
| 1 | `local-projects` | Local projects ([sharing-and-cli §1](specs/sharing-and-cli.md), [ui §11](specs/ui.md)): several projects per template, each opened by its id. `/p/<projectId>` and `/projects` routes: list, open, rename, duplicate, delete, storage indicator, warning above 80% of the quota, `navigator.storage.persist()` on the first project created. | A copy opens at `/p/<id>`, keeps its changes separate from its original after a reload, and deleting it from `/projects` removes it. |
| 2 | `share-url` | `projects.origin` gains `share-url`, with a tested IndexedDB migration if the schema requires it. Sharing by URL `/s#<payload>` ([sharing-and-cli §2](specs/sharing-and-cli.md), [ui §12](specs/ui.md)): versioned codec (delta against the pinned origin, otherwise full files), 8,000-character threshold with the reason shown, Share button in the sandbox. Opening happens in an ephemeral sandbox, with an origin banner, and becomes a local project on the first change or on "Save in my projects". An invalid payload or one of an unknown version shows an error screen. | An E2E shares a changed project, opens the link in a fresh context and finds the same files. A project above the threshold has no link. The codec reads back each version it has emitted. |
| 3 | `export-zip` | Zip export from the sandbox and `/projects` ([sharing-and-cli §4](specs/sharing-and-cli.md)), with the "without the Typika files" option. The removal rule (§6.4) lives in `@typika/manifest`, so that the CLI reuses it. | The zip of `strategy-ts`, of `strategy-go` and of `strategy-kotlin`, extracted, passes its tests with the language's native tool, with and without the Typika files. |
| 4 | `embed` | `/embed/<name>` ([ui §13](specs/ui.md), [security §3.6](specs/security.md), [0016](decisions/0016-isolation-and-embed.md)): editor and output, URL parameters, runtime started on the first interaction, schema-validated `postMessage`, no local persistence, `frame-ancestors` open on `/embed/*` only. "Open in Typika" passes the current state through a slice 2 link. The snippet is copied from the template page. The slice decides, in an ADR, which runtimes run in embed: Go does not use `SharedArrayBuffer`, and Kotlin compiles through the app's relay. | An E2E on the production build embeds `strategy-ts` in a page served on another origin, runs the tests and receives `typika:test-result`. Every other route keeps `frame-ancestors 'none'`. |
| 5 | `cli` | `packages/cli`, `typika` package ([sharing-and-cli §6-7](specs/sharing-and-cli.md)): `typika create` (name or ref, `--variant`, `--exercise`, `--keep-tour`, `--registry`, `--force`, `--json`, exit codes) and `typika validate` (`--run` relies on the `template-check` runners). The tests go through a locally served registry, archives included, since the repository is private. The package is not published on npm. | `typika create strategy-ts`, run against the local registry, produces a project that passes its tests outside Typika, and likewise for the Go and Kotlin variants. `typika validate` reports a deliberately broken template with code `5`. |
| 6 | `github` | Sharing by gist (`/g/<gistId>`) and push to a new repository ([sharing-and-cli §3, §5](specs/sharing-and-cli.md)): OAuth exchange endpoint on the app server, token in `sessionStorage`, scopes requested at the time of the action. It requires a GitHub OAuth App: the development one is created on the maintainer's account, the production one under the `typika-app` organization, at publication (#92). | A secret gist created from the sandbox reopens at `/g/<id>` without signing in. A push creates a repository whose `typika.toml` keeps `parent`. |

The completion criterion is played in two stages. The embed in a third-party page is played in slice 4, and
`typika create` against the local registry in slice 5. `npx typika create` against the public instance waits for the
publication of the package and of the registry (#92).

Status (2026-10-19): slice 1 delivered. A template can have several local projects: `/p/<id>` opens one of them in the
sandbox, and its changes, its reset and applying a solution only affect it. `/play/<name>` still reopens the most
recent one. `/projects` lists the projects with their template, their language, their exercise and their date, and
lets you open, rename, duplicate and delete them after confirmation. The page shows the storage used, and warns above
80% of the quota. "Resume", on the home page, now opens `/p/<id>`. The IndexedDB schema has not changed: the migration
moves to slice 2, with the `share-url` origin.

Slice 2 delivered: the sandbox's Share button creates a `/s#1.<payload>` link, which carries the template's pinned ref
and the files' delta, compressed with `deflate-raw`, or explains that a project is too large above 8,000 characters.
The link opens in an ephemeral sandbox, with a banner that links back to the template. The project is saved on the
first change or on request, under an id derived from the payload: reopening the link reopens the saved copy. An
exercise link carries the exercise name (`x`, added to the format). An invalid payload, a newer one, or one whose
template cannot be found has its message and a way back to the templates. The `share-url` origin did not require a
migration, since IndexedDB records are not typed by the database. A link without an origin (`f` alone) is not opened
yet: it waits for `blank` projects ([sharing-and-cli §2](specs/sharing-and-cli.md)).

Slice 3 delivered: Export, in the sandbox and in `/projects`, downloads the project as a zip, with or without the Typika
files (`typika.toml`, `tour/`). With them, `typika.toml` gets `parent`, the template's pinned ref. The removal rule is
`withoutTypikaFiles` from `@typika/manifest`. The zips of `strategy-ts`, `strategy-go` and `strategy-kotlin`,
downloaded from the app and extracted, pass their tests with `npm test`, `go test` and `gradle test`, with and without
the Typika files. This check is done by hand: the local check does not have all the toolchains, and the E2E checks the
content of the zips.

Slice 4 delivered: `/embed/<name>` shows the editor, the output and a reduced bar (file, Run, Tests, "Open in
Typika"). [ADR 0031](decisions/0031-embed-runtimes.md) runs the three runtimes there. The runtime only starts on the
first click, or on load with `run=auto`, except for Go. The language service only starts on the first focus in the
editor. Under a host page that is not a secure context, the embed runs nothing and says why. The `file`, `lines`,
`tour-step`, `panel`, `readonly`, `run`, `theme` and `lang` parameters are read; `panel=preview` falls back to the
console, for lack of a preview in V1. The embed neither opens nor writes any local project, and the Kotlin compilation
cache stays in memory there. The `typika:ready`, `typika:resize` and `typika:test-result` messages go to the host page,
and `typika:goto-step` and `typika:set-theme` are schema-validated; any other message is ignored. "Open in Typika"
carries the current state through a slice 2 `/s#…` link, or opens `/play/<name>` above the threshold. The theme follows
`data-theme` on the root, and `prefers-color-scheme` without it. Only `/embed/*` has `frame-ancestors *`. The template
page copies the embed snippet. The production E2E embeds `strategy-ts` in a page of another site, runs the tests and
receives `typika:test-result`; in dev, Go and Kotlin also run in embed.

Slice 5 delivered: `packages/cli` contains the `typika` package, which is not published. `typika create` resolves a
name in the index or a `github:` ref, then downloads the archive of the pinned ref and extracts it
([0032](decisions/0032-cli-archives-and-validate.md)). It validates the manifest and writes the project without the
Typika files, then shows the next steps. It handles `--variant`, `--exercise` (initial state, instructions in
`EXERCISE.md`), `--keep-tour`, `--force`, `--json`, `--registry` and `--archive-url`, as well as exit codes 0 to 7.
`typika validate` applies the manifest and workspace checks, with the index's topics, and compares the tour order to
the TypeScript variant. With `--run`, it runs the tests and the exercises in the `template-check` runners, and exits
with `5` as soon as it finds an error. The package's tests go through a local registry that serves the index and
`git archive` archives. The `strategy-ts`, `strategy-go` and `strategy-kotlin` projects, created by the CLI, pass their
tests with `npm test`, `go test` and `gradle test`. This check is done by hand.

Slice 6 split into two PRs ([0034](decisions/0034-github-oauth-and-gists.md)): (a) sign-in, gist and `/g/<id>`; (b)
push to a new repository.

Slice 6 (a) delivered: on an instance that has an OAuth App, the Share dialog offers a gist. "Sign in to GitHub" goes
to GitHub with the `gist` scope, a `state` and a PKCE challenge, then comes back to `/auth/github/callback`, which
exchanges the code through `POST /api/github/token` and keeps the token in `sessionStorage`. The sandbox reopens on the
dialog. The gist, secret by default, carries the full files and `typika.share.json`. Re-sharing a saved project
updates the same gist. `/g/<id>` opens the gist without signing in, in an ephemeral sandbox, like a `/s#…` link. A gist
that cannot be found, cannot be read, is newer, or whose template is missing has its message. The exchange refuses
another `Origin` and rate-limits by IP. The dev and production E2E go through a local fake GitHub
(`scripts/serve-fake-github.ts`, `TYPIKA_GITHUB_URL`, `TYPIKA_GITHUB_API_URL`). The check against the real GitHub, with
the development OAuth App, remains to be done by hand.

Slice 6 (b) delivered: the Export dialog offers to create a GitHub repository. Sign-in requests `public_repo` in
addition to the scopes already granted, and the dialog reopens on return. The form takes the repository name, a
description and the Typika files option. The repository, public, receives the project in a single commit:
`typika.toml` keeps `parent` there, and a minimal README links back to the template if the project does not have one. A
refused name, a session without the permission, an API limit or an incomplete upload has its message, and the form
stays filled in. The code exchange has a configurable rate (`TYPIKA_GITHUB_RATE_PER_MINUTE`,
`TYPIKA_GITHUB_RATE_BURST`). The slice's completion criterion is played against the fake GitHub: a secret gist reopens
at `/g/<id>` without signing in, and a push creates a repository whose `typika.toml` keeps `parent`. It remains to play
it against the real GitHub, by hand, and to link the "propose to the registry" suggestion when the registry is public
(#92).

Review (2026-11-20): the six M5 slices are delivered. A project can be shared through a `/s#…` link or a gist, exported
as a zip or to a new GitHub repository, and embedded through `/embed/<name>`; `typika create` and `typika validate`
exist in `packages/cli`. Slice 6 was played against the real GitHub on 2026-11-20, with a development OAuth App: the
gist reopens at `/g/<id>` and the push creates the repository. The dev server reads from `apps/web/.env.local` (#118).
At the last full check (#117): 24 Turbo tasks out of 24, 44 E2E in production, and 124 E2E out of 125 in dev, the last
one being a Kotlin timeout under load that passes on its own. The E2E were not rerun after #118. The completion
criterion is played locally: the embed runs in a page of another site on the production build, and `typika create`,
against a local registry, produces TS, Go and Kotlin projects that pass their native tests. Its public half
(`npx typika create`, a real third-party page) waits for publication: M5 stays open until then, like M3. We move to M7,
which prepares this publication. What remains open:

- Publication still waits for the trademark search (R6) and the reservation of `typika.dev` and `@typika` (#92). The
  production OAuth App, under `typika-app`, is created at that point.
- `blank` projects do not exist. A link without an origin (`f` alone) therefore does not open, and a gist must point to
  a template in the index ([sharing-and-cli §1 to §3](specs/sharing-and-cli.md)).
- The push only creates public repositories, and the OAuth exchange is a handler of the Node server rather than a
  TanStack route ([0034](decisions/0034-github-oauth-and-gists.md)). "Propose to the registry" is a sentence without a
  link.
- `typika validate --run` has no default Kotlin compilation service
  ([0032](decisions/0032-cli-archives-and-validate.md)).
- The embed E2E only runs in Chromium; WebKit was checked in the spike of
  [ADR 0031](decisions/0031-embed-runtimes.md). `panel=preview` falls back to the console.
- The native tests of the exported zips and of the projects created by the CLI are checked by hand.
- Two dev E2E are flaky under load (#116, and the Kotlin timeout above), and the V8 abort of the dev server has not
  reproduced (#104).
- The Vercel configuration, `SECURITY.md` and GitHub CI are still pending: M7 takes them on.

## M6 — Kotlin

**Goal**: the reference OOP language of the catalogue.

Deliverables:

- `services/kotlin-compiler`: in-house service on `kotlin-compiler-embeddable`, JS target
  ([0019](decisions/0019-kotlin-runtime.md)), with limits and rate limiting: see [security](specs/security.md).
- `packages/runtime-kotlin`.
- Kotlin variants of the 16 concepts.

Done when: the 16 concepts can be compared TS / Kotlin, and the compilation service holds a test load without
exceeding its limits.

### Breakdown

One slice = one `m6/<slice>` branch and one PR. M6 follows M4: first the service and the runtime, tested outside the
app, then their integration, then the catalogue. `strategy-kotlin` and `strategy-base-kotlin` have existed since spike
R8 and serve as the reference for the first three slices. Everything runs locally with Docker, without a public
deployment.

| # | Slice | Content | Done when |
|---|---|---|---|
| 1 | `kotlin-compiler` | `services/kotlin-compiler` ([0019](decisions/0019-kotlin-runtime.md), [runtimes §6.4](specs/runtimes.md)): minimal HTTP server on `kotlin-compiler-embeddable`, protocol 1 (`POST /compile`), two-phase compilation to an ES module with source map, stdlib and `kotlin.test` as the only libraries, warm-up compilation at startup. Limits from [hosting](guides/hosting.md): body, concurrency, queue, memory cache, timeout. The slice decides how to interrupt a compilation (separate process or container restart), in an ADR. Hardened image from [security §3.3](specs/security.md): non-root, read-only FS, no outbound network, logs without bodies. HTTP tests (Vitest) against the container. | `strategy-kotlin` and the four states of its exercises compile. An error responds with its `file:line:column` diagnostics. A body that is too large gets `413`, a full queue `503`, a compilation that exceeds the timeout is interrupted without blocking the following ones. |
| 2 | `runtime-kotlin` | `packages/runtime-kotlin`: protocol client with its errors (`429`, `503`, network), cache by hash, `kotlin.test` harness (`describe` / `it` / `xit`) that emits the `TestEvent`, `location` taken from the source map, `println` captured as `Stdout`. A conformance suite compares its results to those of `gradle test` on the JVM. `template-check` runs the Kotlin templates against the service. | On `strategy-kotlin` and the four states of its exercises, the conformance suite gives the same greens, reds, messages and `file:line` as `gradle test`. |
| 3 | `runtime-kotlin-app` | The `kotlin` runtime in the app: `KOTLIN_COMPILER_URL`, Kotlin templates hidden when it is missing, `429` / `503` toasts, diagnostics of the last run in the editor, Kotlin highlighting, client cache in IndexedDB, CSP `connect-src`. `kotlin` Docker profile on an internal network, `/api/kotlin/*` routed by Caddy, rate limiting by IP (R9, an ADR). The health run and `registry-tools` (V9) cover Kotlin. A load test measures the service behind Caddy. | `/play/strategy-kotlin` starts Run, the tests and the two exercises in Chromium and WebKit. Without the service, the hub hides Kotlin. The load test stays within the limits (`429` / `503` beyond them, no crash or memory overrun). `strategy-kotlin` and its base are `healthy`. |
| 4 | `kotlin-artifacts` | Precompiled artifacts ([runtimes §6.4](specs/runtimes.md)): `registry-tools` compiles each Kotlin template at indexing and publishes the artifact with the index. The runtime uses it as long as the project is not changed. | Opening `strategy-kotlin` and running its tests makes no call to the service. After a change, the next run calls it again. |
| 5 | `catalogue-kotlin` | The 15 remaining Kotlin variants of the [catalogue](specs/catalogue.md), with their bases, one PR per concept and one registry PR per wave. (a) Fundamentals and principles: `composition-over-inheritance-kotlin`, `single-responsibility-kotlin`, `open-closed-kotlin`, `liskov-substitution-kotlin`, `interface-segregation-kotlin`, `dependency-inversion-kotlin`. (b) Design patterns: `observer-kotlin`, `decorator-kotlin`, `factory-method-kotlin`, `adapter-kotlin`. (c) Architectures: `naive-crud-kotlin`, then `hexagonal-kotlin`, `cqrs-kotlin`, `event-sourcing-kotlin`, `outbox-kotlin` and `state-machine-kotlin`. Each tour reuses the ids of the TS variant. The authoring guide completes its Kotlin section. | The 16 Kotlin variants are in the registry, `healthy`, and compare to their TS variant without `W_TOUR_ORDER_DIVERGES`. |

The M6 completion criterion is played at the end of slice 5, the load test in slice 3. Firefox (R2, R7, R8) is checked
during the M6 review, by hand or with a Playwright that launches it.

Status (2026-10-13): slice 1 delivered. `services/kotlin-compiler` compiles with Kotlin 2.4.21 in a JRE 25 image,
non-root, which runs on a read-only FS with a `tmpfs` for `/tmp`. The HTTP supervisor hands each compilation to a warm
compilation process, and kills it at the timeout ([0028](decisions/0028-kotlin-compilation-workers.md)): a trapped
compilation gets `504` while the other process keeps compiling. A process that runs out of memory makes the service
respond `503`, then it is restarted. On 2 vCPU and 1 GiB, `strategy-kotlin` compiles in 0.7 s alone and at 2.4
compilations per second under load, with a peak at 815 MiB. The memory cache goes to 32 MiB by default. A Vitest suite
starts the image in a hardened container: `strategy-kotlin` and the four states of its exercises compile, diagnostics
are in `file:line:column`, and `400`, `405`, `413`, `503` (full queue, crash), `504`, CORS, cache and logs without
sources are covered. The suite requires Docker. The internal network without outbound access comes with the Compose
profile of slice 3.

Slice 2 delivered: `packages/runtime-kotlin` compiles through the service (protocol client, `429`, `503`, `504` and
network errors, in-memory LRU cache by hash until IndexedDB in slice 3), then runs the artifact in a fresh worker per
run, or in a `node:vm` context outside the browser. The `kotlin.test` harness emits the `TestEvent` per file, locates
each failure on the test's line through the source map and captures `println`. The conformance suite compares
`strategy-kotlin`, its base, the four states of its exercises and fixtures (exceptions, `@Ignore`, default package,
each assertion, compilation errors) to `gradle test`, and `main` to `gradle run`: same greens, reds, `file:line`
and messages, once the four messages that JUnit 5 phrases differently are translated (§6.4 of
[runtimes](specs/runtimes.md)). `template-check` runs the Kotlin exercises when `KOTLIN_COMPILER_URL` is set. The
browser tests pass in Chromium and WebKit.

Slice 3 in three PRs: (a) the integration into the app, (b) the deployment (Compose profile, load test), (c) the health
run and `registry-tools`. (a) delivered: the frame asks the app for each compilation through its `MessagePort`, the app
compiles with an IndexedDB cache and calls `/api/kotlin/compile` on its own origin. Its server relays to
`KOTLIN_COMPILER_URL` with rate limiting by IP ([0029](decisions/0029-kotlin-relay-rate-limit.md)), in dev as in
production; Caddy has no route to the service, contrary to what this slice planned. The sandbox highlights Kotlin,
underlines the errors of the last run, explains a saturated (`429`) or unavailable compiler, and a runtime absent from
the instance. Without the service, the hub hides Kotlin once hydrated. The dev E2E starts the service and passes
`/play/strategy-kotlin` (Run, tests, compilation error, cache after reload, the two exercises) in Chromium and WebKit.

(b) delivered: the `kotlin` Compose profile starts the service on an `internal` network, with the protections of
[security §3.3](specs/security.md). `web` is the only other member of this network, and Compose sets
`TYPIKA_TRUST_PROXY=true` for it. A forged `X-Forwarded-For` does not bypass the limit, since Caddy replaces it.
`.env.example` lists the Kotlin variables. A crashed process responds `503` with `Retry-After`, like a full queue, and
the relay does the same when the service does not respond within 25 s. The hub no longer shows Kotlin only to hide it
afterward: it stays hidden as long as the config has not confirmed the service, prerendering included. The load test
(`load-test.ts`, [hosting §4.5](guides/hosting.md)) passes behind Caddy:

- A burst of 30 requests from the same client gets 10 `200` and 20 `429` with `Retry-After`.
- With the limit lifted, 60 simultaneous compilations and two trapped compilations give 10 `200`, 50 `503` with
  `Retry-After` and two `504`.
- The memory peak reaches 829 MiB out of 1 GiB, without a restart or an out-of-memory stop, and the service compiles
  again after the load.

This test plays the case of [0028](decisions/0028-kotlin-compilation-workers.md): the two slots stay blocked by the
trapped compilations for about 18 s. The Kotlin E2E suite passes on the production build behind Caddy, in WebKit as in
Chromium, once the per-IP limit is lifted: otherwise, the suite alone exceeds it.

(c) delivered: `registry-tools build` and `health` run the Kotlin exercises (V9) when `KOTLIN_COMPILER_URL` is set,
like `template-check`. The app build does not run them, since it does not depend on the service. The health run reads
the target instance's `/config.json` and probes Kotlin only if it has a compiler: otherwise, the Kotlin templates stay
skipped rather than `broken`. On the production build connected to the service, `strategy-kotlin` and
`strategy-base-kotlin` are `healthy`. The run, V9 included, asks the service for eleven compilations and stays under
the per-IP limit; for the 16 templates of slice 5, it will have to be lifted on the probed instance. Slice 3 is
delivered.

Slice 4 in two PRs: (a) compiling the artifacts in `registry-tools`, (b) using them in the app. (a) delivered: with
`KOTLIN_COMPILER_URL`, `registry-tools build` compiles each Kotlin template in `test` and `run` modes, as the sandbox
opens it (without `exercises/`). It writes each compilation to `registry/artifacts/kotlin/<key>.json`, under the client
cache key ([runtimes §6.4](specs/runtimes.md)), and deletes the artifacts that no template requests anymore. A template
that does not compile makes the build fail; without the service, the build reports missing or stale artifacts. Those of
`strategy-kotlin` and of its base are committed: 100 to 220 KB each, 18 to 37 KB compressed, and two successive builds
write the same files.

(b) delivered: the app looks for each compilation in its IndexedDB cache, then in `artifacts/kotlin/<key>.json` next to
the registry index, read-only; a missing or unreadable artifact counts as absent from the cache. The `registry-index`
Vite plugin serves these artifacts in dev and emits them at build time, and the production server serves them as
immutable, with a `404` for a missing artifact. The dev E2E opens `strategy-kotlin`, runs its tests and `main` without
any call to `/api/kotlin/compile`, then calls it once after a change. On the production build, Chromium and WebKit make
no call. Exercises are not precompiled: their start state goes through the service. Slice 4 is delivered.

Status (2026-10-15): slice 5, wave (a) delivered. `composition-over-inheritance-kotlin`, `single-responsibility-kotlin`,
`open-closed-kotlin`, `liskov-substitution-kotlin`, `interface-segregation-kotlin` and `dependency-inversion-kotlin`
are in the registry with their bases, `healthy` (#67 to #72), with their 24 precompiled artifacts. The six TS variants
list Kotlin and are re-pinned. Each TS / Kotlin pair has the same step `id`s in the same order, and the comparison
aligns step by step in the browser. Since then, `template-check` and `registry-tools` emit `W_TOUR_ORDER_DIVERGES`
([manifest §5.3](specs/manifest.md)): a variant that does not present the steps shared with its TypeScript reference in
the same order is reported, and no template in the registry is.
The tours rely on what Kotlin makes explicit: `open` to inherit, `by` to delegate, stateless top-level functions,
`fun interface`s whose test fake is a lambda, and a primary constructor that injects in one line. The LSP writes its
contract tests as an abstract test class that each subtype's test class inherits from. The hub in dev lists 35
templates; in production without the service, Kotlin stays hidden.

Status (2026-10-15): slice 5, wave (b) delivered. `observer-kotlin`, `decorator-kotlin`, `factory-method-kotlin` and
`adapter-kotlin` are in the registry with their bases, `healthy` (#76 to #79), with their 16 precompiled artifacts.
`observer-ts`, `decorator-ts`, `factory-method-ts`, `adapter-ts` and `adapter-go` list Kotlin and are re-pinned. No
template emits `W_TOUR_ORDER_DIVERGES`. The Observer's subscribers are lambdas behind a `fun interface`, and
`subscribe` returns an unsubscribe function. The decorators delegate with `: Notifier by inner` and only write the
method they change. The Factory Method creator keeps a final `ship` by default, with one `object` per parcel. The
Adapter translates open `Int` codes into a `sealed` result, and its tour explains why an extension function does not
replace the class. Without a mocking library, the simulated SDKs expose a lookup (`findPayment`, `findCharge`) so that
the tests check what was sent. The hub in dev lists 39 templates.

Status (2026-10-16): slice 5, wave (c) delivered. `naive-crud-kotlin`, the common base, `hexagonal-kotlin`,
`cqrs-kotlin`, `event-sourcing-kotlin`, `outbox-kotlin` and `state-machine-kotlin` are in the registry, `healthy` (#82
to #86), with their 12 precompiled artifacts. `hexagonal-ts`, `hexagonal-go`, `cqrs-ts`, `cqrs-go`,
`event-sourcing-ts`, `outbox-ts`, `outbox-go` and `state-machine-ts` list Kotlin and are re-pinned. HTTP bodies are
`Map<String, Any?>`; on Kotlin/JS, `0.5 as? Int` succeeds, hence `wholeNumber` to read an integer. Commands, changes
and events are `sealed` hierarchies, which `decide` and `evolve` walk with exhaustive `when`s; rehydration is a `fold`.
The outbox relay is synchronous and driven by the tests. The state machine is a `sealed class` whose transition table
is an exhaustive `when`: a forgotten state does not compile. The hub in dev lists 44 templates.

Review (2026-10-19): M6 is delivered. The 16 concepts of the catalogue have their Kotlin variant in the registry, and
compare step by step to their TS variant without `W_TOUR_ORDER_DIVERGES`. The index has 78 entries, 28 of them Kotlin,
all `healthy`. The compilation service held its load test in slice 3. The review follow-ups are closed (#88 to #98):
`registry:build` now only compiles the missing artifacts, and the start state of the Kotlin exercises is precompiled
too ([0030](decisions/0030-kotlin-exercise-artifacts.md)). Opening an exercise then running its tests or its program
no longer calls the service. `registry/artifacts/kotlin/` has 101 artifacts, for 25 MB. The full check is green, with
88 E2E in dev. We move to M5, starting with what can be built without a public deployment: sharing by URL, zip export,
`/embed/<name>` and `typika validate`. What remains open:

- Firefox leaves the scope (#97): Playwright's Firefox still does not start under macOS 27. R2, R7 and R8 are checked
  in Chromium and WebKit, and R2 and R7 also by hand in Safari.
- M3 stays open: publication waits for the trademark search (R6), the `typika` organization and `typika.dev` (#92).
  The gist, the GitHub push, `npx typika create` and the embed in a third-party page of M5 depend on it too.
- The dev server stopped once on a V8 abort while sending a 25 MB module (#104). It has not reproduced.
- The Vercel configuration, `SECURITY.md` and GitHub CI are still pending.

## M7 — Publication

**Goal**: the day #92 is unblocked, publishing only takes a push.

Deliverables:

- The cutover to `typika-app/templates` and `typika-app/registry`, ready on the current `main`.
- The app's GitHub CI, `SECURITY.md` and the supply chain of [security §5](specs/security.md).
- A chosen hosting target and its configuration ([hosting](guides/hosting.md)).
- The repositories, the instance and the `typika` package public.

Done when: the M3 and M5 completion criteria are played on the public instance. A PR to the registry adds a template
without touching the app, a template runs in a third-party page, and `npx typika create strategy-ts` produces a project
that passes its tests.

### Breakdown

One slice = one `m7/<slice>` branch and one PR. Slices 1 to 3 are done without publishing anything. Slice 4 requires a
decision from the maintainer, and slice 5 waits for #92.

| # | Slice | Content | Done when |
|---|---|---|---|
| 1 | `cutover` | The cutover of slice 7 of M3, prepared in October for 38 entries under `typika/…`, is redone on the current `main`: extraction of `templates/` and `registry/` to `typika-app/…`, 78 entries re-pinned, Kotlin artifacts published next to the index, `validate-pr`, `build-index` and `health` workflows with Go and Kotlin, submodules branch rebased. | The extraction ends with a green `registry-tools build` on the 78 entries, and the submodules branch passes the full check. |
| 2 | `ci` | The app's GitHub Actions workflow ([architecture §9](specs/architecture.md)): lint, format, types, tests, build, E2E, then `docker build` and headers E2E on the image. The slice says what stays local if a private repository's minutes are not enough. | A PR shows a green GitHub check, and a deliberately broken test makes it fail. |
| 3 | `security-policy` | `SECURITY.md` ([security §6](specs/security.md)) and the items of [security §5](specs/security.md) that do not require publication: base image pinned by digest, Renovate with an adoption delay. | Each item of §5 is done or attached to slice 5. |
| 4 | `hosting` | Choice of the public instance's target, in an ADR: Docker behind Caddy, the main target, or Vercel with the Kotlin service separate ([hosting §4 to §6](guides/hosting.md)). Then its configuration. | The checklist of [hosting §9](guides/hosting.md) passes on a non-public instance of the chosen target. |
| 5 | `publish` | After #92: repository transfer, creation of the two repositories, Pages and Renovate, production OAuth App, publication of the `typika` package with provenance, public instance, "propose to the registry" link. | The M7 completion criterion. |

Status (2026-11-20): slice 1 ready, nothing is published. The extraction produces `typika-app/templates` and
`typika-app/registry` from the current `main`: the 78 entries are re-pinned on the extracted SHAs, the 101 Kotlin
artifacts follow the registry, and `registry-tools build` passes there, Go and Kotlin exercises included. The workflows
of both repositories call this repository's `.github/actions/setup` action, which installs pnpm, Node, the pinned Go
with its assets, and starts the Kotlin compilation service. `build-index` compiles the missing Kotlin artifacts,
commits them to the registry, then publishes the index and the artifacts on GitHub Pages. These workflows have never
run: `actionlint` validates them, and their first run will happen at publication. The submodules branch,
`m7/registry-repos`, stays local. It carries ADR 0026 and passes the full check: 24 Turbo tasks out of 24, 125 E2E in
dev, 44 in production, and the Docker image, built from the submodules, serves an index of 78 templates. The dev E2E of
`main`, pending since #118, have been rerun: 125 out of 125. Before publication, the templates' manifests must name the
right GitHub account (#120), which will require rerunning the extraction.

Slice 2 delivered: `.github/workflows/ci.yml` plays the local check on each PR that touches something other than the
documentation, and on demand. The `check` job passes in 11 to 15 minutes: lint, format, the 24 Turbo tasks, then
`template-check` and `registry:build` with the Kotlin service. The `e2e` job passes in 18 to 26 minutes: the 125 dev
E2E, the 44 production ones, then the Docker image and the production E2E that do without the test registry. A
deliberately broken test makes `check` fail. It is also the first run of the `setup` action, Kotlin service included.
The runner, slower and without a cache, required four adjustments: `--allowOnly` for the reference Vitest of the
conformance suite (Vitest refuses `.only` when `CI` is set), pre-bundling the dependencies that Vite discovered during
tests, one Turbo task at a time, and 90 seconds per dev E2E instead of 30. A run takes 30 to 40 runner minutes.

Slice 3 delivered, with a correction to slice 2: `grintzdel/typika` has been public since its creation, contrary to
what the roadmap assumed. Actions minutes are therefore not counted there, and `ci` also runs on `main`. `SECURITY.md`
points to GitHub's private reporting, enabled on the repository. The items of [security §5](specs/security.md):

| Item | Status |
|---|---|
| Lockfile and `--frozen-lockfile` in CI | Done (slice 2). |
| Adoption delay | Done: a seven-day `minimumReleaseAge` in pnpm, and `renovate.json` with the same delay. A Renovate dry run on the repository reads 22 files and leaves `templates/`, `registry/` and the fixtures aside. Installing the Renovate app on the repository stays in slice 5. |
| Runtime assets | Done since M4: served by the instance, SHA-256 checked for Go ([0027](decisions/0027-go-assets-delivery.md)). The spec no longer mentions SRI on a CDN. |
| npm provenance | Slice 5, with the publication of the `typika` package. |
| Image built in CI, bases pinned by digest | Done: the five images of the `Dockerfile`, of the Kotlin service and of Compose carry a digest, and `ci` builds the image (slice 2). Renovate will pin the GitHub actions on its first pass. |

Slice 4 delivered: the public instance will run on a VPS, with Docker behind Caddy and the Kotlin service on the same
machine ([0035](decisions/0035-public-instance-hosting.md)). The configuration existed; the slice adds the `443/udp`
port, which Caddy announced for HTTP/3 without Compose publishing it. For lack of a VPS and domains (#92), the checklist
of [hosting §9](guides/hosting.md) was played on the local Compose stack, over HTTPS, with Caddy's internal authority
and the `localhost` and `typika-run.localhost` sites ([hosting §4.6](guides/hosting.md)):

| Item | Result |
|---|---|
| HTTPS on both domains | Passes with Caddy's internal authority. Public certificates wait for slice 5. |
| Two different sites | Passes for the local names. The real domains wait for #92. |
| Headers of `/play`, `/`, `/embed`, runtime origin that does not serve the app, `/config.json` without secrets | Passes, by hand and through the production E2E. |
| Language service, `crossOriginIsolated`, TS template, Go in brotli | Passes through the production E2E: 35 out of 35, excluding `registry`, `health` and `github`. |
| Go not downloaded again after a reload | Passes, checked by a throwaway test. |
| With Kotlin | A changed template compiles through the relay, the hub lists the 16 variants, the `rate` scenario passes (10 `200` responses, 20 `429`), and an outbound connection from the service's network fails. |
| Without Kotlin | No Kotlin template in the hub. |
| With GitHub | Not played: it needs an OAuth App whose callback is the instance. Slice 5, with the production application. |

At rest, `web` uses 30 MiB, Caddy 15 MiB and the Kotlin service 480 MiB out of its 1 GiB cap. The VPS size is chosen in
slice 5: the memory that building the image requires is not measured.

---

## After M7 (not planned)

Ideas, to prioritize when the time comes:

- `blank` projects, without an origin template: they open links without an origin and free-standing gists.
- Next waves of design patterns (remaining GoF, then Repository, Unit of Work, Specification, Null Object,
  Result / Either): see [catalogue](specs/catalogue.md).
- More OOP fundamentals if the first template finds its audience.
- Tour translation (`tour/<locale>/`).
- Self-hostable runner for languages without a browser runtime.
- Composable stacks.

## Tracked risks

| # | Risk | Handling |
|---|---|---|
| R1 | WebContainers license | Cleared: no `node` runtime in V1 ([0017](decisions/0017-node-runtime.md)) |
| R2 | COOP/COEP breaks the embed | Cleared for `browser-js` ([0016](decisions/0016-isolation-and-embed.md)); Safari checked, Firefox out of scope |
| R3 | Runtime weight | Lazy-load, Cache Storage ([0027](decisions/0027-go-assets-delivery.md)), CDN later — M1 / M4 |
| R4 | TS IntelliSense in CodeMirror 6 | Cleared: CodeMirror 6 confirmed ([0015](decisions/0015-editor.md)) |
| R5 | Template rot | Health CI + Renovate — M3 |
| R6 | Project name | Typika chosen ([0014](decisions/0014-name-typika.md)); trademark search before publication (#92) |
| R7 | Go in the browser | Cleared: Go toolchain in WASM ([0018](decisions/0018-go-runtime.md)); Safari checked, Firefox out of scope |
| R8 | Kotlin compilation service | Cleared: in-house service, JS target ([0019](decisions/0019-kotlin-runtime.md)); WebKit checked, Firefox out of scope |
| R9 | Compilation service abuse | Cleared: limits, isolation and rate limiting by IP ([0028](decisions/0028-kotlin-compilation-workers.md), [0029](decisions/0029-kotlin-relay-rate-limit.md)), load test in M6 |
