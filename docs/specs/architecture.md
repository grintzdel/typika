# Code architecture

Status: spec · details §13 and §14 of the [V1 spec](./2026-10-08-typika-v1-design.md)

## 1. Overview

Typika is an app that runs almost entirely on the client. The server serves static files and a single endpoint, plus
an optional Kotlin compilation service.

```
┌─────────────────────────────── browser ───────────────────────────────┐
│ App origin (TYPIKA_PUBLIC_URL)           Runtime origin               │
│ ┌──────────────────────────────┐          (TYPIKA_RUNTIME_ORIGIN)    │
│ │ hub · sandbox · embed        │ postMsg  ┌──────────────────────────┐ │
│ │ React + Effect Atom          │◀────────▶│ runtime frame            │ │
│ │ IndexedDB (projects)         │          │ workers · WASM · preview │ │
│ └──────────────────────────────┘          └──────────────────────────┘ │
└────────┬──────────────────────────┬───────────────────────────────────┘
         │ static + index.json      │ POST /compile (Kotlin only)
         │ POST /api/github/token   ▼
   ┌─────┴──────┐          ┌──────────────────┐        ┌──────────────┐
   │ web (Node) │          │ kotlin-compiler  │        │  Asset CDN   │
   └────────────┘          └──────────────────┘        └──────────────┘
```

User code never runs on the app origin: see [security.md](./security.md).

## 2. Monorepo

pnpm workspaces + Turborepo.

```
apps/
  web/                    # hub + sandbox + embed + runtime frame (TanStack Start)
packages/
  config/                 # base tsconfig, shared oxlint / oxfmt config
  manifest/               # Effect schema of typika.toml, TOML parser, resolution of github: refs
  runtime-core/           # RuntimePort, RuntimeSession, TestEvent, runtime errors and limits
  runtime-browser-js/     # esbuild-wasm + workers
  runtime-go/             # Go toolchain (compile, link) in WASM and build driver
  runtime-kotlin/         # compilation service client + execution
  test-runner/            # Vitest-compatible runner for browser-js, without dependencies
  vitest-reporter/        # Vitest reporter → TestEvent, for test-runner conformance (private)
  cli/                    # npx typika create
  registry-tools/         # index generation, health CI, Kotlin precompilation
services/
  kotlin-compiler/        # Docker image: compilation service (kotlin-compiler-embeddable), Typika protocol
```

Note: the V1 spec (§14) mistakenly puts `test-runner`, `cli` and `registry-tools` under `services/`. They are
TypeScript packages; `services/` contains only deployable services.

### 2.1 Allowed dependencies

| Package | May depend on |
|---|---|
| `config` | — |
| `manifest` | `effect`, `smol-toml` (TOML parser), `spdx-license-ids` (SPDX list) |
| `runtime-core` | `effect`, `manifest` |
| `runtime-*` | `runtime-core`, `manifest`, its technical dependencies |
| `runtime-browser-js` | in addition: `test-runner` (embedded in the execution worker), `esbuild-wasm` |
| `test-runner` | nothing (it is injected into the user code bundle: zero dependencies, minimal size) |
| `vitest-reporter` | `vitest` (peer), `runtime-core` |
| `cli` | `manifest`, `effect` |
| `registry-tools` | `manifest`, `runtime-core`, `runtime-*` |
| `apps/web` | all packages except `cli` and `registry-tools` |

Forbidden:

- a package that depends on an app
- a `runtime-x` that depends on a `runtime-y`
- `manifest` or `runtime-core` depending on React or the DOM: they also run in the CLI and in CI

Check: `turbo boundaries` if the feature fits these rules (to evaluate in M1), otherwise a CI script
`scripts/check-package-boundaries.ts` that reads the `package.json` files.

## 3. `apps/web`

### 3.1 Tree

```
apps/web/
├── server/                # production server: routing by host, static files, headers (hosting §4.1)
└── src/
    ├── modules/           # logic and UI per domain (§3.2)
    ├── features/          # pages: orchestrate presenter hooks + components, no components of their own
    ├── routes/            # TanStack shells (§5)
    ├── ui/                # design system (Base UI + cva), without business logic
    └── i18n/              # react-i18next resources (en, fr)
```

### 3.2 Modules

| Module | Responsibility | Main ports |
|---|---|---|
| `shared` | Effect helpers, base errors, HTTP client, runtime configuration (`/config.json`) | `AppConfig` |
| `app` | Composition: `AppLayer`, atom runtime, React providers | — |
| `hub` | Index loading, concepts, facets, template pages; search in slice 4 of M3 | `RegistryIndexPort`, `SearchIndexPort` |
| `project` | Local projects: creation from a template, files, modified state, reset, persistence | `ProjectStoragePort`, `TemplateIndexPort`, `TemplateFilesPort` |
| `editor` | CodeMirror 6, tabs, languages, adapter for the TS language service in a worker ([0015](../decisions/0015-editor.md)), decorations (tour, diagnostics) | `LanguageServicePort` |
| `runtime` | Bridge between a project and a `RuntimeSession`: boot, FS sync, run, tests, console, preview | `RuntimeRegistry`, `RuntimeFramePort` |
| `tour` | Tour steps, safe Markdown rendering, anchoring on files and lines | `MarkdownRendererPort` |
| `compare` | Two variants side by side, read-only, steps aligned by id | — |
| `exercise` | Loading an exercise, tracking the tests, validation | — |
| `share` | Sharing through URL fragment or gist, zip export, import of a link | `ShareCodecPort`, `ArchivePort` |
| `github` | OAuth, gists, repo creation, push | `GitHubPort`, `GitHubTokenPort` |

Dependencies between modules: `editor` → `project`; `exercise` → `runtime`, `project`; `compare` → `project`, `editor`,
`tour`; `share` → `project`,
`github`; `runtime` → `project`. Any module may use `shared`. No cycle.

### 3.3 Module topology

```
<module>/
├── core/
│   ├── domain/
│   │   ├── <module>.domain-model.ts      # Effect schemas + derived types
│   │   ├── errors/<context>.error.ts     # TaggedError <Module><Context>Error
│   │   └── constants/<name>.constant.ts  # as const objects
│   ├── ports/
│   │   └── <name>.port.ts                # interface + Context.Tag
│   ├── adapters/
│   │   ├── <name>.<techno>.adapter.ts    # e.g. project-storage.indexeddb.adapter.ts
│   │   └── <name>.<techno>.adapter.test.ts
│   ├── programs/
│   │   └── <action>/
│   │       ├── <action>.program.ts       # Effect.gen operation
│   │       └── <action>.program.test.ts
│   ├── atoms/
│   │   ├── <module>.atoms.ts
│   │   └── <module>.atoms.test.ts
│   ├── <module>.layer.ts                 # Layer of the module's adapters
│   └── <module>.test-layer.ts            # in-memory adapters for tests
└── ui/
    ├── components/<Name>.tsx             # pure: props in, events out
    └── hooks/use-<action>-<module>.ts    # presenter hooks
```

Deliberate departures from the usual topology (`commands/`, `queries/`, `repository/`, `gateway/`, `store/`):

| Usual | Here | Reason |
|---|---|---|
| Server `commands/` + `queries/` | Client `programs/` | No business backend; the read / write split stays visible in the name (`open-project`, `list-projects`) |
| `repository/` + `gateway/` | `ports/` + `adapters/` | The dependencies are varied (IndexedDB, workers, GitHub, CDN); a single vocabulary |
| Redux `store/` | Effect Atom `atoms/` | Decision of the V1 spec §13 |

New suffixes: `.port.ts`, `.adapter.ts`, `.program.ts`, `.atoms.ts`, `.layer.ts`. The others follow the usual
conventions (`.domain-model.ts`, `.error.ts`, `.constant.ts`, `.test-layer.ts`, `.test.ts`,
`.test.e2e.ts`, components in PascalCase).

### 3.4 Data flow

```
pure component ──event──▶ presenter hook ──useAtomSet──▶ atom (fn) ──▶ program ──▶ port ──▶ adapter
      ▲                         │                                                          │
      └──────props─────── useAtomValue ◀──────────── atom (value / Result) ◀───────────────┘
```

- **`AppLayer`** (`modules/app/app.layer.ts`) merges the `<module>.layer.ts` files with `Layer.mergeAll`. A single atom
  runtime is created from it (`Atom.runtime(AppLayer)`).
- **Atoms**: a read atom exposes a `Result` (loading, success, failure); a function atom triggers a program.
  Atoms contain no logic: they call programs.
- **Presenter hooks**: read the atoms, expose a simple API (`{ files, isDirty, save, reset }`). No
  `useMemo` / `useCallback`: React Compiler takes care of it.
- **Components**: props and callbacks only. No import of an atom, a port or an adapter.
- **Features**: the only place where hooks and components meet.

**Hub pages**: they are prerendered, so their data goes through route loaders and not through atoms.
The loader, exported by `features/hub/hub.loaders.ts`, runs a program of the `hub` module with `runHubProgram`, a
`ManagedRuntime` built on `HubLayer`. On the server, `RegistryIndexPort` reads the index of the build (virtual module
`virtual:typika/registry-index`). On the client, it downloads it. The loader returns only the model of its page
([0023](../decisions/0023-hub-prerendering.md)).

**Hot state**: the content of the file being edited lives in the CodeMirror state, not in an atom. The `editor`
module emits the changes; `project` persists them (batched IndexedDB write, ~300 ms) and `runtime` relays them
to the `RuntimeFs`. An atom never receives a keystroke.

**Language service**: `languageServiceAtom` starts, per template, a worker on the app origin that holds a TypeScript 6
project in memory (`@typescript/vfs`), with the files of the open project, `lib.es2022`, the runtime globals
and the `vitest` declarations emitted from `@typika/test-runner` (virtual module of the
`vite/typescript-libraries.ts` plugin). The editor receives the session as a prop and enables its extensions
(completion with auto-import, diagnostics, hover, signatures) through a `Compartment` as soon as it is ready: it is
usable before that. Each change is pushed to the worker by the extension, not by an atom. The files of `exercises/`
stay out of the analyzed project. The worker is stopped with the atom's scope, hence on reset.

**Runtime frame**: `RuntimeFramePort` wraps the iframe of the runtime origin and a `MessageChannel`. On the app side,
a `RuntimeSession` is a proxy that serializes the calls; on the frame side, the real runtimes run. Messages are
validated by Effect Schema on both sides.

The frame announces `RuntimeFrameReady` to the app origin (read from its own `config.json`); the app replies `Connect`
with a `MessageChannel` port, and the frame accepts this message only from its parent and from that origin. After that,
the protocol (`runtime-frame-protocol.domain-model.ts`) follows `RuntimeSession`: one request per operation,
identified by an integer; streams send `Emitted` then `Ended` or `Failed`, and the app sends `Interrupt` when its
consumer stops. Errors cross the channel as data (`RuntimeErrorData`) and become
`TaggedError`s again on the app side.

The frame is a separate Vite entry (`vite.runtime.config.ts`, base `/runtime/`, output `dist/runtime/`). In dev,
`pnpm dev` runs the app on `http://localhost:3000` and the frame on `http://127.0.0.1:3001`: two distinct sites,
with the isolation headers of [hosting](../guides/hosting.md).

### 3.5 Server

`POST /api/github/token` exchanges the OAuth `code` for a token. It lives in the app's Node server
(`server/github-token.ts`), next to the Kotlin relay, and in the same middleware in dev: it needs the rate
limiter and the client IP ([0034](../decisions/0034-github-oauth-and-gists.md)). `/config.json` stays a TanStack Start
server route.

The Kotlin service is outside `apps/web` (`services/kotlin-compiler`).

## 4. Rendering

| Area | Mode | Reason |
|---|---|---|
| Hub (`/`, `/templates`, `/templates/$name`) | Static prerendering | Indexing by search engines, zero server cost |
| Sandbox, comparison, projects, embed | SPA (`ssr: false`) | IndexedDB, workers and runtime iframe: nothing to render on the server |
| Runtime frame | Minimal static page, outside React | Loads fast, shares nothing with the app |

The hub prerendering depends on the index at build time: an index update triggers a rebuild (see
[hosting.md](../guides/hosting.md)). The build renders `/` and `/templates`, then follows their links to the template
pages. The SPA shell is rendered on `/play/_shell` and written to `_shell.html`. A template page absent from the build
is served by the shell, and its loader downloads the index. The prerendered HTML is in English, and the browser
language applies after hydration ([0023](../decisions/0023-hub-prerendering.md)). The `health` slice of M3 will reload
the index on the client to show up-to-date health.

## 5. Routes

| Route | Feature | Rendering | Isolation headers |
|---|---|---|---|
| `/` | `hub/home.page.tsx` | prerendered | no |
| `/templates` (facets in search params) | `hub/templates/templates.page.tsx` | prerendered + client | no |
| `/templates/$name` | `hub/templates/$name/template.page.tsx` | prerendered | no |
| `/play/$templateName` (`?exercise=…`, `?panel=diff`) | `play/play-template.page.tsx` | SPA | yes |
| `/p/$projectId` | `projects/project.page.tsx` | SPA | yes |
| `/compare/$name` (`?a=<lang>&b=<lang>`) | `compare/compare.page.tsx` | SPA | yes |
| `/projects` | `projects/projects.page.tsx` | SPA | no |
| `/s` (state in the `#…` fragment) | `share/open-shared.page.tsx` | SPA | yes |
| `/g/$gistId` | `play/play-template.page.tsx` | SPA | yes |
| `/embed/$templateName` | `embed/embed.page.tsx` | SPA | no ([0016](../decisions/0016-isolation-and-embed.md)) |
| `/auth/github/callback` | `auth/github-callback.page.tsx` | SPA | no |
| `/api/github/token` | Node server (`server/github-token.ts`) | — | — |
| `/config.json` | server route | — | — |
| `/runtime/frame.html` (runtime origin) | outside the router | static | yes |

"Isolation headers" = `Cross-Origin-Opener-Policy` + `Cross-Origin-Embedder-Policy` (details in
[security.md](./security.md) and [hosting.md](../guides/hosting.md)). The shell routes import the page and do
nothing else.

## 6. Import rules

Checked by `import/no-restricted-paths` (oxlint) or, failing that, by `scripts/check-import-rules.ts` in CI.

- `modules/*/ui/components/**` imports neither `core/atoms`, nor `core/ports`, nor `core/adapters`, nor `core/programs`.
- `modules/*/core/domain/**` imports nothing other than `effect` and `shared/core/domain`.
- `modules/*/core/programs/**` does not import `core/adapters`: it knows only the ports.
- `modules/*/core/**` imports neither React nor `ui/`.
- `features/**` contains no component; `routes/**` imports only features.
- A module imports another module only through its ports, its atoms or its domain types, never its adapters.
- Effect is imported per module: `import * as Effect from 'effect/Effect'`.

## 7. Conventions

- Files and folders in kebab-case with a role suffix; React components in PascalCase (file and export).
- TaggedError: `<Module><Context>Error` (`ProjectNotFoundError`, `GitHubTokenExchangeError`).
- Schemas: `<Entity>Schema`, derived type `<Entity>` without a suffix.
- Constants: `as const` objects + derived type; never an `enum`.
- Ports: `<Name>Port` interface + tag of the same name. Adapters: `make<Name><Techno>(deps)` + `<Name><Techno>Layer`.
- Programs: `<action><Entity>Program` (`openProjectProgram`, `listProjectsProgram`).
- Presenter hooks: `use<Action><Module>` (`useOpenProject`).
- Comments: none by default, see the global rules.

## 8. Tests

TDD: red Playwright E2E tests, then red unit tests layer by layer, then implementation.

| Target | Tool | Dependencies |
|---|---|---|
| Schemas (`manifest`, domains, runtime messages) | Vitest | none |
| Programs | Vitest + `Effect.runPromiseExit` | `<module>.test-layer.ts` (in-memory adapters) |
| IndexedDB adapters | Vitest | `fake-indexeddb` |
| Runtimes (`runtime-*`), workers, WASM | Vitest in browser mode (Playwright provider) | real workers, assets served locally |
| `test-runner` | Vitest | conformance suite: the same test files give the same `TestEvent`s as with the real Vitest + `@typika/vitest-reporter` |
| Atoms | Vitest | test atom registry + test layer |
| Presenter hooks | Vitest + Testing Library (`renderHook`) | test atom registry |
| Components | Vitest + Testing Library | props only |
| User journeys | Playwright, `.test.e2e.ts` colocated in `features/` | built app, local fixture templates |
| Kotlin service | HTTP tests (Vitest) against the container | Docker |

Required cross-cutting tests:

- **Headers**: an E2E test checks the headers of each route of §5 and that `self.crossOriginIsolated === true` in the
  runtime frame, and runs the tests of a template under the real CSP (`src/e2e/production/`, `pnpm test:e2e:production`).
  It runs against the locally built production server, the Docker image and each preview deployment. The
  dev server sets the same isolation headers, without the CSP, which Vite and its HMR do not respect.
- **Isolation**: an E2E test runs a fixture template that tries to read IndexedDB and `localStorage` of the app origin
  and to make an external `fetch`; everything must fail.
- **Fixture templates**: `apps/web/e2e/fixtures/templates/` contains a minimal template per runtime; no
  dependency on the real registry in the app's CI.

## 9. Tooling

- **Lint / format**: oxlint and oxfmt, shared config in `packages/config`.
- **Types**: `tsc --noEmit` per package through Turborepo.
- **CI (GitHub Actions)**, on each PR and each push to `main` that touch something other than the documentation
  (`.github/workflows/ci.yml`):
  a `check` job (lint, format, `turbo run typecheck test`, `template-check`, `registry:build`, with Go, Gradle and the
  Kotlin service) and an `e2e` job (dev E2E, production E2E, then `docker build` and the production E2E without the
  test registry against the image). The `.github/actions/setup` action installs the common tooling.
- **Dependencies**: lockfile required, Renovate (`renovate.json`) and seven days before adopting a new
  version ([security §5](./security.md)).
- **Publishing**: `cli` and `test-runner` published on npm with provenance; package names under the
  `@typika` scope ([ADR 0014](../decisions/0014-name-typika.md)).
