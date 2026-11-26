# Typika — V1 spec

Status: draft for discussion · 2026-10-08

> Initial design spec, kept as a record of the discussions. The documents in [docs/](../README.md) and the
> [ADRs](../decisions/README.md) detail it and are authoritative in case of divergence.

## 1. Vision

A **free and open source** tool to explore, run and compare code templates — by language, library,
framework and above all **by pattern / architecture concept** (hexagonal, CQRS, event sourcing, outbox, saga…).

The **template hub is the product**; the sandbox is the means to explore them. A template must stay useful outside
the sandbox (`npx typika create <template>`, GitHub export).

### Targets

- **Primary — the intermediate developer learning architecture.** They master a language, have already shipped
  code, and want to understand CQRS or hexagonal other than through an article and a diagram. They are the ones who
  justify the tours, the comparison, the diff since the base and the exercises.
- **Secondary — the content author** (blog, docs, training). They are not the target, they are the **channel**: each
  embed brings learners.
- **Not targeted in V1 — rapid prototyping.** StackBlitz and CodeSandbox already do it better than we do.

Arbitration rule: in case of conflict, the feature that serves the learner wins.

## 2. Principles

1. **Browser first** — all code execution happens client-side. Only tolerated exception: a stateless
   **compilation** service when no compiler runs in the browser (Kotlin, §7.2). The server compiles,
   it never runs the code.
2. **Zero business backend** — no database. The hub is a static index generated from a registry repository.
3. **No account by default** — a GitHub account only to publish or to push to a repo.
4. **Pedagogy > exhaustiveness** — 15 excellent templates are worth more than 500 dead templates.
5. **Visible health** — every template is tested continuously; a broken template shows.

## 3. Scope

### V1

- Languages: TypeScript, JavaScript, Go, Kotlin — run in the browser (§7.1), delivered in stages.
- Initial catalogue (§6.1): 5 architecture patterns, 5 SOLID principles, 5 GoF design patterns and 1 OOP
  fundamentals template. TS covers the whole catalogue; the other languages cover a selection (§6.1).
- Hub: faceted navigation, search, template page, health badge.
- Sandbox: editor, file tree, console, preview, tests panel.
- Guided tours, compare mode, "diff since the base" view, exercises (red tests → green).
- Iframe embed.
- Sharing by URL / gist, zip / GitHub export, `create` CLI.

### Outside V1

- Real-time collaboration.
- AI template generation.
- Server-side execution on the public instance (the self-hostable runner is V2).
- Composable templates (base + add-ons) — V2, as curated *stacks*.
- Python, Rust and other languages — V2.
- Self-hostable server runner — V2, and fallback plan if a browser runtime fails in a spike.

## 4. Domain glossary

| Term | Definition |
|---|---|
| **Template** | Reference project described by a `typika.toml` manifest, living in a Git repo. |
| **Manifest** | Metadata, facets, runtime, commands, tour, exercises, variants, base. |
| **Facet** | Classification axis: `language`, `framework`, `library`, `paradigm`, `topic`, `level`, `useCase`. |
| **Topic** | What the template teaches, sorted by category: `architecture` (hexagonal, CQRS…), `design-pattern` (GoF), `principle` (SOLID, law of Demeter…), `fundamental` (encapsulation, polymorphism…). |
| **Variant** | The same concept implemented in another language / framework. Feeds the compare mode. |
| **Base** | "Naive" reference template from which the template derives. Feeds the diff view. |
| **Tour** | Sequence of Markdown steps anchored on files / line ranges. |
| **Exercise** | Challenge attached to a template. `fix`: some tests are red, they must be turned green. `refactor`: the tests are green, a new requirement must be added (red tests provided) that is only simple after restructuring the code. |
| **Project** | Local instance (IndexedDB) of a template, editable by the user. |
| **Runtime** | Browser execution environment (`browser-js`, `go`, `kotlin`). |
| **Registry** | Git repository that references the published templates; generates the hub's static index. |
| **Health** | State computed by the registry CI: `healthy`, `degraded`, `broken`, `deprecated`. |

## 5. Manifest format

The normative spec, frozen at schema 1, is [manifest.md](./manifest.md). This example shows its shape.

```toml
schema = 1
name = "hexagonal-architecture"
title = "Hexagonal architecture"
summary = "Ports and adapters: the domain depends on nothing, adapters depend on the domain."
license = "MIT-0"
authors = ["github:maoudin"]

[facets]
language = "typescript"
paradigm = ["oop"]
topic = ["architecture/hexagonal", "architecture/ports-adapters", "principle/dependency-inversion"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "browser-js"          # browser-js | go | kotlin
entry = "src/main.ts"

[commands]
start = "src/main.ts"
test = "vitest"

[tour]
steps = ["tour/01-domain.md", "tour/02-ports.md", "tour/03-adapters.md"]

[base]
template = "github:typika-app/templates/hexagonal-base/ts"

[variants]
kotlin = "github:typika-app/templates/hexagonal/kotlin"
go = "github:typika-app/templates/hexagonal/go"

[[exercises]]
kind = "fix"
name = "add-email-adapter"
title = "Add an e-mail adapter"
failing = ["tests/notification.test.ts"]
```

Rules:

- The manifest is validated by an Effect schema shared between the app, the CLI and the registry CI (`manifest`
  package).
- Tour steps anchor code through a `file` + `region` front matter (markers in the code) or `lines`.
- A template reference is always `github:<owner>/<repo>[/<path>][@<ref>]`.
- `schema` is versioned; the app rejects a manifest with an unknown version with an explicit message.

## 6. Hub and registry

### 6.1 Initial catalogue

| Category | Templates | Base (diff view) |
|---|---|---|
| Architecture | Hexagonal, CQRS, event sourcing, outbox, state machine | Naive CRUD |
| Principles | SRP, OCP, LSP, ISP, DIP | The same code violating the principle |
| Design patterns | Strategy, Observer, Decorator, Factory Method, Adapter | The code before the pattern (`switch`, direct coupling…) |
| OOP fundamentals | Composition vs inheritance | Deep inheritance hierarchy |

Writing principles:

- Each principle / design pattern template has a **base** that shows the problem: the diff view is the lesson.
- Each template has at least one `refactor` exercise: a new requirement that is painful in the base, trivial with the
  pattern.
- Variants are not literal translations. When the pattern dissolves into the language, the variant
  shows it and the tour says so: in Go, no inheritance or classes, interfaces are implicit — Strategy becomes a
  function, "composition vs inheritance" has only one answer. The compare mode becomes a lesson about the language.
- Templates reference each other: the DIP tour points to hexagonal ("the DIP applied at the scale of an
  application").

Design patterns beyond V1, in waves of 5, each wave mixing the three GoF families:

| Family | V1 | Next |
|---|---|---|
| Creational | Factory Method | Abstract Factory, Builder, Singleton (presented with its pitfalls), Prototype |
| Structural | Decorator, Adapter | Facade, Composite, Proxy, Bridge, Flyweight |
| Behavioral | Strategy, Observer | Command, State, Template Method, Chain of Responsibility, Iterator, Visitor, Mediator, Memento, Interpreter |
| Outside GoF | — | Repository, Unit of Work, Specification, Null Object, Result / Either, Dependency Injection |

The family is a subcategory of the topic: `design-pattern/behavioral/strategy`.

OOP fundamentals (encapsulation, polymorphism, abstract classes…): a single template in V1 to validate the interest;
they aim at a more beginner audience than the primary target.

### 6.2 Coverage per language

We do not port everything to every language: each language covers what it teaches best.
**TypeScript is the reference language**: the whole catalogue exists in it, and it defines the order of the tour
steps, which the variants follow so that the comparison stays aligned.

| Concept | TS | JS | Go | Kotlin |
|---|---|---|---|---|
| Architecture (5) | ✓ | — | hexagonal, CQRS, outbox | ✓ |
| SOLID (5) | ✓ | — | DIP, ISP | ✓ |
| GoF V1 (5) | ✓ | Observer, Decorator | Strategy, Decorator, Adapter | ✓ |
| Composition vs inheritance | ✓ | ✓ (prototypes vs classes) | ✓ | ✓ |

That is about 44 templates.

- **JS** is not a copy of TS without types: it only has a variant where it teaches something else (prototypes,
  native events).
- **Go** only has the concepts that make idiomatic sense (no classes, no inheritance, implicit interfaces); the
  rest would be classic OOP written in Go.
- **Kotlin** is the reference OOP language of the catalogue: full coverage. Its features make it an excellent
  subject for comparison — `by` delegation (Decorator, composition), `object` (Singleton), `sealed` + `when` (State,
  Visitor), first-class functions (Strategy), `data class` (Value Object).

### 6.3 Registry and index

- **Registry** = the `typika-app/registry` repo. A PR adds a `{ ref, maintainers }` entry. Human review for
  curation.
- **Index** = `index.json` generated by the registry CI (resolved manifests + health), published as a static asset.
- Weekly **health CI**: for each template, install, start, run the tests in the same browser runtime
  as the app (headless Playwright).
  - `healthy`: everything passes. `degraded`: warnings / outdated deps. `broken`: failure.
  - `broken` for 90 days → `deprecated`, hidden from the hub by default.
- **Renovate** enabled on the `typika-app/*` repos.
- Client-side **search** (MiniSearch or Orama) on the static index. Deliberate exception to the "no client-side
  filtering" rule: there is no backend, and the index (a few hundred entries) fits in memory.
- **Remix**: forking a template keeps a `parent` link; the page shows the diff with the parent.

## 7. Execution

### 7.1 V1 runtimes

| Runtime | Tech | Use |
|---|---|---|
| `browser-js` | esbuild-wasm + Web Worker, in-house test runner compatible with the Vitest API (describe/it/expect) | Patterns in plain TS, libraries, simple Vite front end. Covers most architecture templates. |
| `go` | Go toolchain (`cmd/compile`, `cmd/link`) compiled to WASM ([ADR 0018](../decisions/0018-go-runtime.md)) | Go templates. |
| `kotlin` | Compilation to Kotlin/JS by an in-house compilation service (§7.2, [ADR 0019](../decisions/0019-kotlin-runtime.md)), execution and `kotlin.test` in the browser | Kotlin templates. |

Stages:

| Stage | Runtimes | Milestone |
|---|---|---|
| 1 | `browser-js` | M1 |
| 2 | `go` | M4 |
| 3 | `kotlin` | M6 |

No `node` runtime in V1 (§7.3).

Tests: each runtime translates the output of its native tool (Vitest reporter, `go test -json`, `kotlin.test`
reporter) into the normalized events of §7.4.

Databases: PGlite and SQLite WASM, exposed as template dependencies, not as a platform service.

### 7.2 Kotlin: compiling without a browser compiler

The Kotlin compiler is a JVM program; there is no official version that runs in the browser.

- **Chosen option** ([ADR 0019](../decisions/0019-kotlin-runtime.md)): an in-house compilation service around
  `kotlin-compiler-embeddable` (Apache 2.0). It receives sources and returns a JS module; the browser runs the
  result and the `kotlin.test` tests. Stateless, no storage, separate Docker container, rate limiting per IP, sources
  limited in size. About 1 s per warm compilation on 2 vCPUs and 1 GiB.
- **Options rejected by spike R8**: `kotlin-compiler-server` (no `kotlin-test` for JS, JVM execution on the
  server, 1.7 GB image) and `kotlinc` in the browser through CheerpJ (license without self-hosting).
- **Constraint for templates**: JS target, so no JVM-specific API (`java.*`). No impact for architecture and
  pattern code.

### 7.3 WebContainers license: no `node` runtime

The WebContainers API requires a commercial license as soon as an instance serves customers or employees, and depends
on StackBlitz's servers. Nodebox is under a non-OSI license restricted to non-commercial use. No template in the
catalogue needs Node: the `node` runtime leaves V1 ([ADR 0017](../decisions/0017-node-runtime.md)).

### 7.4 Runtime contract

Each runtime implements the same port (`RuntimePort`, `Context.Tag`):

- `boot(project)` → scoped resource (`Effect.acquireRelease`); leaving the project releases the worker.
- `run(command)` → `Stream` of stdout / stderr output, interruptible.
- `test()` → `Stream` of normalized test events (`suite`, `pass`, `fail`, `done`), used by the tests panel
  and the exercises.
- `preview()` → preview URL if the runtime exposes one.

### 7.5 Cross-origin isolation

`SharedArrayBuffer` (WASM threads) requires COOP/COEP on the page. An iframe in a third-party page cannot
be isolated: the embed runs `browser-js`, which does not need it, and sends to the app for the other
runtimes ([0016](../decisions/0016-isolation-and-embed.md)).

## 8. UI features

### Hub

- Home: entries by pattern (highlighted), by language, by framework.
- Combinable facets, full-text search, health filter.
- Template page: summary, facets, health, variants, base, tour, "Open in the sandbox" button, CLI command.

### Sandbox

- Layout: file tree · editor · bottom panel (console / tests) · preview or tour on the right.
- **CodeMirror 6** editor; TS through a TypeScript language service in a worker.
- Reset to the original template, diff of my changes.

### Pedagogy

- **Tour**: steps panel; each step opens the file and highlights the anchored lines.
- **Comparison**: two variants side by side, navigation synchronized by tour step when the tours are aligned.
- **Diff since the base**: file-by-file view of what the pattern adds compared to the `base` template.
- **Exercises**: loads the "red tests" state, shows the progress, validates when everything is green.

### Embed

- `/embed/<template>` route: reduced UI (editor + output), options through the query string (`file`, `tour-step`,
  `readonly`, `theme`).
- Iframe snippet that can be copied from the template page.

## 9. Persistence, sharing, export

- Projects in IndexedDB, local "my projects" list.
- Sharing:
  - small project → compressed state in the URL fragment (not sent to the server)
  - beyond a threshold → gist through the user's GitHub token
- Export: zip, push to a new GitHub repo.
- `typika create <template> [dir]` CLI: downloads the template, removes the Typika-specific files (tour,
  exercises) unless `--keep-tour`.
- Server components: the GitHub OAuth token exchange (one function, no storage) and the Kotlin compilation
  service (§7.2).

## 10. Languages

- **Interface**: i18n from the start (`react-i18next`), delivered in English and French.
- **Template content** (title, summary, tours, exercise statements): **English only in V1**. A contributor
  writes once, and an unmaintained translation ends up contradicting the code.
- The format allows for extension: optional `tour/<locale>/*.md`, falling back to English. Enabled in V2 if there is
  demand.

## 11. Hosting

The app is **hosting-agnostic**: a static build + a single endpoint (`POST /api/github/token`, OAuth
exchange, no storage).

- **Kotlin compilation service**: separate container in the `docker-compose.yml`, can be disabled (Kotlin
  templates are then hidden). On Vercel, deployed separately (VPS or managed container) and pointed to by an env
  variable.
- **Docker (main target, VPS)**: multi-stage image — pnpm build, then a minimal Node runtime that serves the static
  files and the endpoint. Caddy in front for automatic TLS and headers. `docker-compose.yml` provided.
- **Vercel / Cloudflare / others**: same build; headers declared in the platform config (`vercel.ts`, etc.).
- **Mandatory headers on all targets**: `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` on the sandbox routes, not on the embed
  ([0016](../decisions/0016-isolation-and-embed.md)). Checked by an E2E test so that no deployment target
  forgets them.
- **Heavy assets** (Go runtime, esbuild-wasm): served from a COEP-compatible public CDN (jsDelivr) by default,
  self-hostable through an env variable for private instances. Avoids paying for bandwidth on a VPS.

## 12. Licenses

- **Platform** (app, packages, CLI): **MIT**. Standard of the JS ecosystem, no friction to contribute or
  reuse.
- **Official templates** (`typika-app/*`): **MIT-0** (MIT without the attribution requirement). A template is made to
  be copied into projects, proprietary ones included, through `typika create`; requiring a license notice in every
  generated project would be a hindrance.
- **Third-party templates**: free license chosen by the author, declared in the manifest and shown on the template
  page. The registry rejects templates without an OSI license.

## 13. Stack

### What we keep from the usual stack

| Element | Reason |
|---|---|
| TypeScript, Effect | Manifest schema shared by app / CLI / CI; runtime life cycle (Scope, interruption, Stream) — this is exactly Effect's territory. |
| Modular `core/` + `ui/` architecture, `domain-model`, TaggedError, `as const` constants | Unchanged. |
| Ports via `Context.Tag` + Layers | Runtimes, storage, registry, GitHub are ports with adapters. |
| React 19 + Compiler, Tailwind v4, Base UI | Unchanged. |
| TanStack Router (via TanStack Start, static prerendering of the hub) | Hub pages indexable by search engines; sandbox as a SPA. |
| Pure components + presenter hooks, thin features, shell routes | Unchanged. |
| Vitest, Playwright, oxlint, oxfmt | Unchanged. Playwright also serves the registry health CI. |

### What we remove

| Element | Reason |
|---|---|
| Nitro API routes, Drizzle, Neon, server commands / queries | No business backend. |
| Redux Toolkit, redux-persist, outbox, connectivity | The hot state (file contents, process output) changes too fast for Redux; the app is offline by nature, there is no server mutation to queue. Replaced by **Effect Atom** (`@effect-atom/atom-react`), already used through effect-form, plugged directly into the Effect services. |
| HTTP gateways + `extraArgument` | Replaced by Layers on the client side. |
| Auth, multi-tenant | No accounts; GitHub OAuth only. |

## 14. Code organization

pnpm + Turborepo monorepo.

```
apps/
  web/                         # hub + sandbox + embed (TanStack Start)
packages/
  manifest/                    # Effect schema of the manifest, TOML parser, ref resolution
  runtime-core/                # RuntimePort, normalized test events
  runtime-browser-js/
  runtime-go/
  runtime-kotlin/
  test-runner/                 # Vitest-compatible runner for browser-js
  cli/                         # npx typika create
  registry-tools/              # index generation + health CI
services/
  kotlin-compiler/             # Docker image of the compilation service
```

Modules of `apps/web/src/modules/`: `shared`, `app`, `hub`, `project`, `editor`, `runtime`, `tour`, `compare`,
`exercise`, `share`, `github`.

Topology of a module:

```
<module>/
├── core/
│   ├── domain/        # schemas, errors, constants
│   ├── ports/         # Context.Tag + interfaces
│   ├── adapters/      # implementations (IndexedDB, GitHub, workers…)
│   ├── programs/      # Effect business operations (former commands/queries, client side)
│   └── atoms/         # Effect Atoms exposed to the UI
└── ui/
    ├── components/
    └── hooks/
```

## 15. Risks and spikes

| # | Risk | Spike |
|---|---|---|
| R1 | WebContainers license incompatible | Read the terms, test Nodebox, measure the coverage of `browser-js` alone. |
| R2 | COOP/COEP breaks the embed | Prototype an iframe embedded on a third-party domain. |
| R3 | Weight of the runtimes (10 to 30 MB) | Lazy-load when a template of the language is opened, Service Worker cache, explicit loading indicator. |
| R4 | TS IntelliSense in CodeMirror 6 | Prototype a language service in a worker on a 20-file template. |
| R5 | Template rot | Health CI + Renovate from the first template. |
| R6 | Project name | First name, Temenos, dropped (Temenos AG, a listed banking software vendor). Typika chosen, trademark search to do ([ADR 0014](../decisions/0014-name-typika.md)). |
| R7 | Go in the browser | Language coverage by Yaegi (generics, `testing`) versus the weight of the full toolchain. |
| R8 | Kotlin | Resolved: in-house compilation service, JS target ([ADR 0019](../decisions/0019-kotlin-runtime.md)). |
| R9 | Abuse of the compilation service | Rate limiting, max source size, compilation timeout, no outgoing network access from the container. |

## 16. Milestones

Step-by-step progression, with no date and no launch: each milestone delivers something usable, and we decide on the
next one once the previous one is done.

1. **M0 — Spikes** R1, R2, R4, R7, R8. Go and Kotlin technical choices.
2. **M1 — Foundation**: `manifest`, `runtime-browser-js`, `test-runner`, minimal sandbox (tree + editor + console + tests).
3. **M2 — Pedagogy**: tour, diff since the base, `fix` and `refactor` exercises. §6.1 catalogue in TS, JS variants.
4. **M3 — Hub**: registry, index, health CI, prerendered hub pages, search.
5. **M4 — Go & comparison**: `runtime-go`, Go variants, compare mode.
6. **M5 — Sharing**: embed, URL / gist sharing, export, CLI.
7. **M6 — Kotlin**: compilation service, `runtime-kotlin`, Kotlin variants.

## 17. Decisions made

| Topic | Decision |
|---|---|
| Execution | Browser first, self-hostable runner in V2 |
| Templates | Static in V1, composable stacks in V2 |
| Target | Intermediate developer learning architecture; content authors as a channel |
| Initial catalogue | 5 architectures, 5 SOLID, 5 GoF, 1 OOP fundamental (§6.1) |
| Languages | UI in en + fr; template content in English |
| Hosting | Docker on a VPS as the main target, compatible with Vercel and others |
| Licenses | MIT for the platform, MIT-0 for the official templates |
| Languages | TS, JS, Go, Kotlin; TS as the reference language; Kotlin compiled server-side, run in the browser |

## 18. Open questions

1. Trademark search on "Typika" (R6).
