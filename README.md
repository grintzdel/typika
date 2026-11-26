# Typika

**Runnable code templates to learn software architecture, SOLID and design patterns — in your browser.**

Articles show a UML diagram and thirty lines of code out of context. You see the shape of a pattern, rarely why it
exists. Typika is a free, open source hub of small, real projects that you open, run, break and refactor without
installing anything. Each one shows the problem before the pattern, walks you through the code, and asks you to make a
change that hurts without the pattern and is trivial with it.

> **Status:** in active development. Everything below runs locally; the public instance and the `typika` npm package
> are not published yet. See the [roadmap](docs/roadmap.md).

## What a template gives you

- **A base** — the same code before the pattern, so you see the problem it solves. A diff view shows what changed.
- **A guided tour** — Markdown steps anchored to files and lines, from the overview to the trade-offs ("when not to use
  it").
- **Exercises** — `fix` (make the red tests pass) and `refactor` (add a requirement that is painful in the base and
  easy once the pattern is in place). Tests run in the browser.
- **Variants** — the same concept in TypeScript, JavaScript, Go and Kotlin, side by side. A variant is not a
  translation: when a pattern dissolves into a language feature, the variant shows it.

Every template shares one domain — a small online shop that takes orders, computes prices, charges, ships and
notifies — so moving from one concept to the next, you only see what changes.

## Catalogue

16 concepts, 44 templates, plus their bases. TypeScript is the reference language and covers the whole catalogue.

| Concept                      | Kind            | TS  | JS  | Go  | Kotlin |
| ---------------------------- | --------------- | :-: | :-: | :-: | :----: |
| Hexagonal                    | Architecture    |  ✓  |     |  ✓  |   ✓    |
| CQRS                         | Architecture    |  ✓  |     |  ✓  |   ✓    |
| Event sourcing               | Architecture    |  ✓  |     |     |   ✓    |
| Outbox                       | Architecture    |  ✓  |     |  ✓  |   ✓    |
| State machine                | Architecture    |  ✓  |     |     |   ✓    |
| Single responsibility        | SOLID           |  ✓  |     |     |   ✓    |
| Open/closed                  | SOLID           |  ✓  |     |     |   ✓    |
| Liskov substitution          | SOLID           |  ✓  |     |     |   ✓    |
| Interface segregation        | SOLID           |  ✓  |     |  ✓  |   ✓    |
| Dependency inversion         | SOLID           |  ✓  |     |  ✓  |   ✓    |
| Strategy                     | Design pattern  |  ✓  |     |  ✓  |   ✓    |
| Observer                     | Design pattern  |  ✓  |  ✓  |     |   ✓    |
| Decorator                    | Design pattern  |  ✓  |  ✓  |  ✓  |   ✓    |
| Factory Method               | Design pattern  |  ✓  |     |     |   ✓    |
| Adapter                      | Design pattern  |  ✓  |     |  ✓  |   ✓    |
| Composition over inheritance | OOP fundamental |  ✓  |  ✓  |  ✓  |   ✓    |

Templates live in [`templates/`](templates) and are referenced by the [`registry/`](registry). Each one is a plain
project described by a [`typika.toml`](docs/specs/manifest.md) manifest, uses only the standard library and a test
tool, and is licensed MIT-0: copy it anywhere, no attribution required.

## Features

- **Hub** — browse and search templates by language, topic and level, with the health of each one.
- **Sandbox** — a CodeMirror 6 editor (TypeScript diagnostics, completion for Go and Kotlin), a file tree, run and
  test.
- **Compare** — two variants of the same concept side by side.
- **Projects** — your edits are kept locally in IndexedDB. No account needed.
- **Share** — by URL, as a GitHub gist, or pushed to a new GitHub repository. Export as a zip.
- **Embed** — drop a runnable template into a blog post or a course page with an iframe.
- **CLI** — `typika create` copies a template into a real project on your machine.

The interface is available in English and French; template content is in English.

## How it works

Typika runs your code in the browser, never on a server.

- **TypeScript / JavaScript** are bundled by esbuild-wasm and run in workers, with a Vitest-compatible test runner.
- **Go** uses the official Go toolchain compiled to WebAssembly: Typika compiles and links your module in the browser.
- **Kotlin** is the one exception: no compiler runs in the browser, so a stateless service compiles it to JavaScript,
  which then runs in the browser. The service compiles, it never executes.

User code runs on a dedicated runtime origin, isolated from the app origin that holds your projects and GitHub token.
There is no database and no user account: the hub is a static index built from a Git registry, and GitHub OAuth is
only requested to create a gist or push a repository. The reasons behind each choice are recorded as
[ADRs](docs/decisions/README.md).

## CLI

Once the package is published:

```bash
npx typika create strategy-ts
```

```text
typika create <template> [dir] [--variant <language>] [--exercise <name>] [--keep-tour] [--no-install] [--force]
typika validate [dir] [--run] [--kotlin-compiler <url>]
```

`<template>` is a registry name (`strategy-ts`) or a Git ref (`github:owner/repo/path@sha`). `validate` checks a
template's manifest and tour before you submit it to the registry; `--run` also runs its tests.

## Repository layout

```text
apps/web/                 hub, sandbox, embed and runtime frame (React 19, TanStack Start, Effect)
packages/
  manifest/               typika.toml schema and parser
  runtime-core/           the contract every runtime implements
  runtime-browser-js/     TypeScript and JavaScript runtime
  runtime-go/             Go toolchain in WebAssembly and its build driver
  runtime-kotlin/         client of the Kotlin compilation service
  test-runner/            dependency-free, Vitest-compatible runner
  cli/                    the `typika` command
  registry-tools/         index build, health checks, Kotlin precompilation
  template-check/         validates and runs every template in templates/
services/kotlin-compiler/ Kotlin compilation service (Docker image)
templates/                official templates
registry/                 registry entries, Kotlin artifacts, health results
docs/                     vision, specs, guides and ADRs
```

## Development

Requirements: Node.js 24+, pnpm 10, Go 1.24.5 (to build the Go runtime assets), and Docker for Kotlin.

```bash
pnpm install
```

```bash
pnpm --filter @typika/runtime-go build:assets
```

```bash
pnpm --filter @typika/web dev
```

The app is served on `http://localhost:3000` and the runtime frame on `http://127.0.0.1:3001`. The main checks:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm template-check
```

Browser tests need Chromium and WebKit, the Kotlin tests need Docker running, and the E2E suite has its own setup. All
of it is described in [CONTRIBUTING.md](CONTRIBUTING.md). CI runs the full suite on every pull request.

## Self-hosting

Typika needs two domains on different sites: one for the app (`TYPIKA_PUBLIC_URL`), one for the runtime origin
(`TYPIKA_RUNTIME_ORIGIN`). Two Compose files cover the common setups.

**On a bare server** — [`docker-compose.yml`](docker-compose.yml) builds the images on the machine and puts them
behind Caddy, which handles TLS for both domains. Kotlin is an optional profile.

```bash
cp .env.example .env
```

```bash
docker compose --profile kotlin up -d --build
```

Leave out `--profile kotlin` (and `KOTLIN_COMPILER_URL`) to run without Kotlin.

**Behind a platform proxy (Coolify, or any proxy that already holds ports 80 and 443)** —
[`docker-compose.coolify.yml`](docker-compose.coolify.yml) runs `web` and `kotlin-compiler` without Caddy and without
publishing a port. It builds nothing: it pulls `ghcr.io/typika-app/typika-web` and
`ghcr.io/typika-app/typika-kotlin-compiler`, published for amd64 and arm64 on every commit to `main`. In Coolify, create
a Docker Compose resource on this file, attach both domains to the `web` service on port 3000, and set
`TYPIKA_PUBLIC_URL`, `TYPIKA_RUNTIME_ORIGIN` and, for gists and repositories, `GITHUB_CLIENT_ID` and
`GITHUB_CLIENT_SECRET`. Kotlin is always on. Each redeploy pulls `latest`; set `TYPIKA_IMAGE_TAG` to a commit SHA to pin
a version.

Environment variables, Vercel, GitHub OAuth, memory needs and the post-deployment checklist are covered in the
[hosting guide](docs/guides/hosting.md).

## Documentation

| Document                                                | Content                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| [Vision](docs/vision.md)                                | Problem, audience, principles, scope, glossary              |
| [Roadmap](docs/roadmap.md)                              | Milestones M0 → M7 and their current state                  |
| [Catalogue](docs/specs/catalogue.md)                    | Each concept: what it teaches, its base, tour and exercises |
| [Manifest](docs/specs/manifest.md)                      | The `typika.toml` reference                                 |
| [Runtimes](docs/specs/runtimes.md)                      | The runtime contract, `browser-js`, `go`, `kotlin`          |
| [Architecture](docs/specs/architecture.md)              | Monorepo, modules, data flow, tests                         |
| [Security](docs/specs/security.md)                      | Threat model and mitigations                                |
| [Writing a template](docs/guides/template-authoring.md) | Guide for template authors                                  |
| [Decisions](docs/decisions/README.md)                   | Architecture decision records                               |
| [Full index](docs/README.md)                            | Every spec and guide                                        |

## Contributing

Open an issue before any significant change. To propose a template, start with the
[authoring guide](docs/guides/template-authoring.md) and the [catalogue](docs/specs/catalogue.md). See
[CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and conventions.

Found a vulnerability? Report it privately, as described in [SECURITY.md](SECURITY.md).

## License

The platform (app, packages, CLI, service) is MIT. Official templates are MIT-0. See
[ADR 0011](docs/decisions/0011-licenses.md).
