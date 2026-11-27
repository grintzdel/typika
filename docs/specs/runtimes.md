# Runtimes

Status: spec · details §7 of the [V1 spec](./2026-10-08-typika-v1-design.md)

A runtime runs a project in the browser: it writes the files, starts a command, runs the tests and may expose a
preview. Three runtimes are planned:

| `kind` | Languages | Tier | Milestone | Blocking spike |
|---|---|---|---|---|
| `browser-js` | TS, JS | 1 | M1 | — |
| `go` | Go | 2 | M4 | [R7](../spikes.md) |
| `kotlin` | Kotlin (JS target) | 3 | M6 | [R9](../spikes.md) (R8 cleared: [ADR 0019](../decisions/0019-kotlin-runtime.md)) |

The template format, the tests panel and the exercises only know the contract described here. A runtime that fails
its spike is replaced behind this contract (fallback plan: self-hostable server runner, V2) without touching the
templates.

The `node` runtime (WebContainers) is dropped from V1 ([ADR 0017](../decisions/0017-node-runtime.md)).

## 1. Contract

### 1.1 Port

`packages/runtime-core` exposes the contract. It depends on `effect` and on `@typika/manifest` (manifest types,
`RuntimeKind`, path validation).

```ts
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import type * as Scope from 'effect/Scope'
import type * as Stream from 'effect/Stream'

export interface RuntimePort {
  readonly kind: RuntimeKind
  readonly load: Stream.Stream<RuntimeLoadProgress, RuntimeAssetLoadError>
  readonly boot: (
    snapshot: ProjectSnapshot
  ) => Effect.Effect<RuntimeSession, RuntimeBootError | RuntimeAssetLoadError, Scope.Scope>
}

export interface RuntimeSession {
  readonly fs: RuntimeFs
  readonly run: (command: RunCommand) => Stream.Stream<ProcessOutput, RuntimeExecutionError>
  readonly test: (options: TestOptions) => Stream.Stream<TestEvent, RuntimeExecutionError>
  readonly preview: Effect.Effect<Option.Option<PreviewHandle>>
}

export interface RuntimeFs {
  readonly writeFile: (path: ProjectPath, content: FileContent) => Effect.Effect<void, RuntimeFsError>
  readonly deleteFile: (path: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly rename: (from: ProjectPath, to: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly sync: (snapshot: ProjectSnapshot) => Effect.Effect<void, RuntimeFsError>
}

export type RuntimeExecutionError =
  | RuntimeCompileError
  | RuntimeProcessError
  | RuntimeTimeoutError
  | KotlinCompilerRateLimitedError
  | KotlinCompilerUnavailableError

export class RuntimeRegistry extends Context.Service<
  RuntimeRegistry,
  {
    readonly get: (kind: RuntimeKind) => Effect.Effect<RuntimePort, RuntimeUnsupportedError | RuntimeAssetLoadError>
  }
>()('@typika/RuntimeRegistry') {}
```

Design points:

- **`boot` is scoped.** The session lives in the `Scope` of the open project. Closing the scope (leaving the sandbox,
  switching template, unmounting the embed) terminates the workers, frees the WASM memory and stops the processes. No
  manual `dispose()`.
- **`load` is separate from `boot`.** It downloads the runtime assets and emits the progress for the loading
  indicator ([R3](../spikes.md)). `boot` calls it if needed; the UI can call it ahead of time (preloading on hover of
  the "Open in the sandbox" button).
- **`run` and `test` return `Stream`s.** Interrupting the consumer fiber interrupts the process (§4).
- **`preview`** returns `Option.none()` for the runtimes without a preview (`go`, `kotlin` in V1).
- **`RuntimeRegistry`** resolves a `kind` to a `RuntimePort` through a dynamic import: the code of a runtime is only
  loaded if a template in that language is opened. `makeRuntimeRegistry(loaders)` builds it from one import per
  `kind`; a `kind` without an import gives `RuntimeUnsupportedError`, an import that fails gives `RuntimeAssetLoadError`
  and is retried on the next call. A loaded port is kept for the lifetime of the registry.
- **`RuntimeExecutionError`** groups everything that can interrupt a `run` or a `test`, watchdog and Kotlin service
  included.

This contract refines §7.4 of the V1 spec: `boot` returns a session that carries `run`, `test`, `preview` and the file
system, rather than exposing these operations at the port level.

### 1.2 Input types

```ts
// RuntimeKind comes from @typika/manifest.

export const ProjectPathSchema = Schema.String.pipe(Schema.check(/* relative path, §3.2 */), Schema.brand('ProjectPath'))
export type ProjectPath = typeof ProjectPathSchema.Type
export type FileContent = string | Uint8Array

export interface ProjectSnapshot {
  readonly files: ReadonlyMap<ProjectPath, FileContent>
  readonly manifest: Manifest
}

export interface RunCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly env?: Readonly<Record<string, string>>
}

export interface TestOptions {
  readonly files?: ReadonlyArray<ProjectPath>
  readonly namePattern?: string
}

export const ProcessOutputSchema = Schema.Union([
  Schema.TaggedStruct('Stdout', { chunk: Schema.String }),
  Schema.TaggedStruct('Stderr', { chunk: Schema.String }),
  Schema.TaggedStruct('Exit', { code: Schema.Int }),
])
export type ProcessOutput = typeof ProcessOutputSchema.Type

export interface PreviewHandle {
  readonly url: string
  readonly reload: Effect.Effect<void>
}
```

`RunCommand` comes from the `[commands]` of the manifest ([manifest.md](./manifest.md)). Each runtime interprets the
command in its own language: `browser-js` expects an entry point, `go` a package, `kotlin` a
`main` function.

## 2. Test events

Each runtime translates the output of its native tool into this single schema. The tests panel, the exercises, the
registry health CI and comparison mode only consume it.

### 2.1 Schema

Defined in Effect Schema in `packages/runtime-core/src/domain/test-event.domain-model.ts`. Optional fields are
`Schema.optionalKey`: absent, never `undefined`, to go through `postMessage` and JSON without loss.

```ts
export const TestLocationSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Int,
  column: Schema.optional(Schema.Int),
})

export const TestFailureSchema = Schema.Struct({
  message: Schema.String,
  expected: Schema.optional(Schema.String),
  actual: Schema.optional(Schema.String),
  stack: Schema.optional(Schema.String),
  location: Schema.optional(TestLocationSchema),
})

export const DiagnosticSchema = Schema.Struct({
  severity: Schema.Literal('error', 'warning'),
  message: Schema.String,
  location: Schema.optional(TestLocationSchema),
})

export const TestEventSchema = Schema.Union(
  Schema.TaggedStruct('RunStarted', { runId: Schema.String, startedAt: Schema.Number }),
  Schema.TaggedStruct('Diagnostics', { runId: Schema.String, diagnostics: Schema.Array(DiagnosticSchema) }),
  Schema.TaggedStruct('SuiteStarted', {
    runId: Schema.String,
    suiteId: Schema.String,
    parentId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
  }),
  Schema.TaggedStruct('TestPassed', {
    runId: Schema.String,
    testId: Schema.String,
    suiteId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
    durationMs: Schema.Number,
  }),
  Schema.TaggedStruct('TestFailed', {
    runId: Schema.String,
    testId: Schema.String,
    suiteId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
    durationMs: Schema.Number,
    failure: TestFailureSchema,
  }),
  Schema.TaggedStruct('TestSkipped', {
    runId: Schema.String,
    testId: Schema.String,
    suiteId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
    reason: Schema.optional(Schema.Literal('skip', 'todo', 'filtered')),
  }),
  Schema.TaggedStruct('Output', {
    runId: Schema.String,
    testId: Schema.optional(Schema.String),
    stream: Schema.Literal('stdout', 'stderr'),
    chunk: Schema.String,
  }),
  Schema.TaggedStruct('SuiteFinished', { runId: Schema.String, suiteId: Schema.String }),
  Schema.TaggedStruct('RunFinished', {
    runId: Schema.String,
    status: Schema.Literal('passed', 'failed', 'errored'),
    passed: Schema.Int,
    failed: Schema.Int,
    skipped: Schema.Int,
    durationMs: Schema.Number,
  })
)
export type TestEvent = Schema.Schema.Type<typeof TestEventSchema>
```

### 2.2 Rules

- **Stable identifier.** `testId = makeTestId(file, suite path, name)` and `suiteId = makeSuiteId(file, suite
  path)`: 64-bit FNV-1a, 16 hexadecimal characters. We do not use `effect/Hash`, whose value can change from one
  Effect version to another. The same test keeps the same id from one run to
  the next and from one session to the next: the tests panel can show "was red, now green", and an exercise
  can track its progress.
- **Guaranteed order**: `RunStarted` first, `RunFinished` last, each `SuiteStarted` closed by its
  `SuiteFinished`. A runtime that does not provide suites (Go) only emits tests without a `suiteId`.
- **Compilation error**: `Diagnostics` then `RunFinished` with `status: 'errored'`. This is not a failure of the
  `Stream`: the user must see their errors in the tests panel, not an error screen.
- **Interruption**: the `Stream` is interrupted, no `RunFinished` is emitted. The consumer shows "interrupted".
- **`RunFinished.status`**: `passed` if `failed === 0`, `failed` otherwise, `errored` if the run could not run the
  tests (compilation, worker crash, global timeout).
- **Conformance**: `checkTestEventSequence(events)` checks these rules on a complete run (order, single `runId`,
  suite nesting, unique `testId`s, counters and `status` of `RunFinished`) and returns the list of violations.
  The tests of each runtime and the registry health CI use it.
- An exercise is validated when a `passed` `RunFinished` covers all the files listed in `failing` (see
  [manifest.md](./manifest.md)).

### 2.3 Mapping of native outputs

| Runtime | Native source | Translation |
|---|---|---|
| `browser-js` | `@typika/test-runner` emits `TestEvent`s directly | None |
| `go` | `test2json` format (`go test -json`): `Action` = `run` / `pass` / `fail` / `skip` / `output` | `run` → no event, `pass` → `TestPassed`, `fail` → `TestFailed` (message = accumulated `output` of the test), `skip` → `TestSkipped`, `output` → `Output`; subtests `TestX/sub` → `SuiteStarted` for `TestX` |
| `kotlin` | The compiler registers each test class as a suite and each `@Test` as a test with the `kotlin.test` adapter; the runtime harness provides this adapter (`describe` / `it`) | Per test file: root suite = package (none for the default package), then one suite per class; passed test → `TestPassed`, exception → `TestFailed` (§6.4), `@Ignore` on a test or a class → `TestSkipped` |

A line that does not validate against the schema is passed on as `stderr` `Output` and logged; it does not break the
run (`decodeTestEventLine(runId, line)`).

## 3. Virtual file system

### 3.1 Source of truth

The `project` module is the source of truth: tree and contents live in IndexedDB, the editor writes to the project,
never to the runtime. The runtime receives a **copy**:

1. `boot(snapshot)` mounts the complete state.
2. Each change to the project is relayed through `fs.writeFile` / `deleteFile` / `rename`.
3. `fs.sync(snapshot)` realigns everything (after a reset, an import, or if the runtime reports a desync).

The files produced by the runtime (build artifacts, compiled binaries) **never** go back up into the project: they
are neither persisted, nor shared, nor exported.

### 3.2 Rules

- POSIX paths relative to the project root, without `..`, without absolute paths. Validated by the `ProjectPath`
  schema.
- Text in UTF-8; binary accepted (`Uint8Array`) within the limit of §8.
- Typika-specific files (`typika.toml`, `tour/`) are present in the runtime FS: a template can read them, it must not
  depend on them.

### 3.3 Implementation per runtime

| Runtime | Target FS |
|---|---|
| `browser-js` | In-memory `Map` in the session, which applies the limits of §8; it is passed to the build worker at each build, and the esbuild plugin resolves imports against it |
| `go` | In-memory FS installed under the `fs` API that `wasm_exec.js` expects; shared by `compile`, `link` and the program |
| `kotlin` | No persistent FS: the sources are sent to the compilation service at each `run` / `test` |

## 4. Lifecycle and interruption

```
         load()            boot()
Idle ──────────▶ Loaded ──────────▶ Ready ◀──────────┐
  ▲                                   │ run() / test()│
  │                                   ▼               │
  │                                Busy ──────────────┘
  │                                   │ end of the Stream or interruption
  └──────── closing the Scope ────────┘
```

- **A single foreground execution per session.** Starting `test` during a `run` interrupts the `run`.
- **Hard interruption.** An infinite loop in user code never gives control back: we do not rely on cooperative
  interruption. Interrupting the fiber calls `worker.terminate()`; the session creates a clean worker on the next
  `run` / `test`, from its FS.
- **Watchdog.** Each `run` / `test` has a timeout (§8). When it is exceeded, the session interrupts and emits
  `RuntimeTimeoutError`.
- **Worker crash** (WASM error, out of memory): `RuntimeProcessError`, the worker is recreated on the next call.
- **Scope closing**: `acquireRelease` terminates all the workers and revokes the preview URLs.

## 5. Lazy loading and cache

- **Code**: each `runtime-*` is a separate chunk, loaded by `RuntimeRegistry` the first time a template of that
  `kind` is opened.
- **Assets** (`.wasm` files, test runner bundle, harness): served by the runtime origin, from the app image
  ([0027](../decisions/0027-go-assets-delivery.md)). Each asset is versioned in its URL and listed in an asset
  manifest with its size and SHA-256, checked after the download. A CDN (`TYPIKA_ASSETS_BASE_URL`) remains
  possible: the runtime receives a base URL.
- **Cache**: the runtime loader puts its assets in Cache Storage, in a cache named after the assets key, and
  deletes the caches of the other keys. Versioned URLs ⇒ immutable cache, no invalidation to handle. No Service
  Worker for these assets ([0027](../decisions/0027-go-assets-delivery.md)).
- **Progress**: `load` emits `RuntimeLoadProgress` (`{ asset, loadedBytes, totalBytes }`); the UI shows the size to
  download before the first load of a heavy runtime.
- **Preloading**: on hover of "Open in the sandbox", at most one runtime at a time.

## 6. Runtimes

### 6.1 `browser-js`

Default runtime for TS and JS. Covers the architecture, SOLID and design pattern templates, which are pure
logic.

**Pipeline**

1. A build worker, created at `boot` and kept for the session, runs **esbuild-wasm** from the WASM module compiled
   by `load`. A plugin resolves relative imports against the virtual FS (missing extension, `index`, `.js` that
   designates a `.ts`) and package imports to an ESM CDN, in the versions read from the project's `package.json`.
   The project's `tsconfig.json` is passed to esbuild: `verbatimModuleSyntax` keeps unused imports there, like `tsc`.
2. The bundle runs in a dedicated **execution worker**, recreated at each `run` / `test`, which imports the code
   through a `blob:` URL. `console.*` is captured and emitted as `Stdout` / `Stderr`.
3. For `test`, the session selects the files according to `[tests]` (or `TestOptions.files`) and produces **one bundle
   per test file**: each file has its own modules, like the default isolation of Vitest. The execution worker
   embeds `@typika/test-runner`; in the bundles, `vitest` is a module that reads the runner API back from the
   worker global. The runner emits `TestEvent`s directly.
4. Preview: if the template has an `index.html`, the bundle is served in a preview iframe on the runtime origin by
   the Service Worker. No DOM in the workers: a template that needs the DOM goes through the preview. Not yet
   implemented: `preview` returns `Option.none()` as long as no template of the catalogue needs it.

**`run`**

- `RunCommand.command` is the path of the file to run; `args` and `env` are ignored in V1.
- Like Node, the program ends when it has no pending timer left (`setTimeout`, uncancelled `setInterval`):
  `Exit` `0`. An uncaught error, at load time or later, is written to `Stderr` and gives `Exit` `1`.
- A build error gives `RuntimeCompileError`. For `test`, it gives `Diagnostics` then `errored` `RunFinished`.
- The watchdog covers the build and the execution.

**Vitest compatibility**

Templates import from `vitest`. In the sandbox, `vitest` is aliased to `@typika/test-runner`. Outside the
sandbox (after `typika create`), the same code runs with the real Vitest. A template must only use the API
supported below; the registry CI runs the tests in both environments to guarantee it.

| Supported in V1 | Not supported in V1 |
|---|---|
| `describe`, `it` / `test`, `.skip`, `.only`, `.todo`, `.each`, `.skipIf`, `.runIf` | Snapshots (`toMatchSnapshot`, inline) |
| `beforeAll`, `afterAll`, `beforeEach`, `afterEach` | `vi.mock` (module mock) |
| `expect`: `toBe`, `toEqual`, `toStrictEqual`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeNaN`, `toBeTypeOf`, `toBeInstanceOf`, `toContain`, `toContainEqual`, `toHaveLength`, `toHaveProperty`, `toMatch`, `toMatchObject`, `toThrow`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toBeCloseTo`, `.not`, `.resolves`, `.rejects` | Code coverage |
| `expect.any`, `anything`, `objectContaining`, `arrayContaining`, `stringContaining`, `stringMatching` | `expect.extend`, `expect.soft`, `expect.assertions` |
| `vi.fn`, `vi.spyOn`, `toHaveBeenCalled*`, `toHaveReturned(With)` | DOM environments (`jsdom`, `happy-dom`) |
| `vi.useFakeTimers` (minimal: `advanceTimersByTime`, `runAllTimers`, `runOnlyPendingTimers`, `setSystemTime`, `Date`) | `vitest.config.*` configuration (ignored) |
| Per-test timeout (`it(name, fn, ms)`) | Parallel execution of files |

**Conformance and translation**

`@typika/test-runner` is checked against the real Vitest: the fixtures of `packages/test-runner/conformance/` pass
in both, `@typika/vitest-reporter` translates the Vitest output into `TestEvent`s, and the two event sequences
must be identical (identifiers, order, statuses, first line of the failure messages, console output of the tests).
The TS tests of the templates in the repository also run in the runner and must be green.

Where Vitest has no equivalent in the schema, the translation is fixed as follows, on both sides:

| Situation | Vitest | `TestEvent` |
|---|---|---|
| Failing `beforeAll` | Suite failed, tests not run | `TestFailed` for each test, with the hook error and `durationMs: 0` |
| Failing `afterAll` | Suite failed, tests passed | `Diagnostics` before `SuiteFinished`, `errored` `RunFinished` |
| Error while loading the file or in the body of a `describe` | Module failed, no tests | `Diagnostics`, no tests, `errored` `RunFinished` |
| Test excluded by an `.only` | `skip` mode | `skip` `TestSkipped` |
| Test excluded by `TestOptions.namePattern` | — | `filtered` `TestSkipped` |
| Thrown value that is not an `Error` | No message | `message` = the thrown string, or `Thrown value: <JSON>` |
| `console.*` in a `beforeAll` / `afterAll` | Attached to the suite | `Output` without `testId` (outside conformance) |

**npm dependencies**

Resolved from an ESM CDN through a URL template (`{name}`, `{version}`, `{path}`); by default jsDelivr,
`https://cdn.jsdelivr.net/npm/{name}@{version}{path}/+esm`, already used for the assets. A package missing from the
`package.json` is a build error; the version is the one in the `package.json`, as is.

A module imported by a worker is loaded with CORS, so it is compatible with COEP `require-corp` if the CDN answers with
`Access-Control-Allow-Origin`. Checked in M1 (2026-10-09): jsDelivr (`+esm`) sends `Access-Control-Allow-Origin: *` and
`Cross-Origin-Resource-Policy: cross-origin`; esm.sh sends `Access-Control-Allow-Origin: *` and can replace jsDelivr
with the template `https://esm.sh/{name}@{version}{path}`. `node:*` imports and Node built-in modules (`fs`,
`path`…) are refused at build time; the packages that depend on them are not supported in V1.

**Weight** (measured on 2026-10-09, esbuild minified): `esbuild.wasm` 13.3 MiB (3.6 MiB gzipped, 2.6 MiB in brotli);
execution worker with the test runner 32 KiB (11 KiB gzipped), of which 30 KiB (10 KiB gzipped) for the runner; build
worker 4.5 KiB excluding esbuild-wasm.

### 6.2 `node` — outside V1

Dropped by the [R1](../spikes.md) spike ([ADR 0017](../decisions/0017-node-runtime.md)): WebContainers and Nodebox
require a commercial license for some of the instances and depend on their vendor's servers. No template of the
catalogue needs it. The templates that require an HTTP server or `npm install` wait for the self-hostable runner
(V2).

### 6.3 `go`

**Official Go toolchain compiled to WASM** ([ADR 0018](../decisions/0018-go-runtime.md)): `compile.wasm`,
`link.wasm` and a precompiled stdlib for `GOOS=js GOARCH=wasm`, in the execution worker, on an in-memory FS.

- **Driver**: the runtime does the work of the `go` command. It reads `go.mod`, orders the packages of the module by
  their imports, writes the `importcfg`, compiles each package (`-p`, `-complete`, `-pack`), then links.
- `run` compiles the `main` package that contains `[commands].start` and runs the produced binary.
- `test` compiles the tested package with its internal tests, the external `_test` package if there is one, then a
  generated `_testmain.go`. It lists the discovered `TestXxx` and provides its own implementation of `testDeps`, so as
  not to pull in `testing/internal/testdeps`. The binary runs with `-test.v=test2json`; the driver converts the output
  to the `test2json` format, then the mapping of §2.3 applies.
- **`test` command**: `go test` tests each package of the module that has test files, like `go test ./...` outside
  of Typika. `TestOptions.files` restricts to the packages of those files. `TestOptions.namePattern` becomes
  `-test.run`, but each level of the pattern is searched as a substring of the name: `regexp` is not in the embedded
  stdlib. Examples, benchmarks and fuzzing targets are not run, and `go vet` does not run before the tests.
- **Cache**: compiled archives in memory, by hash of the sources and of the archives they depend on; only what has
  changed is recompiled. A package that the tests of another one recompile (internal `_test.go` files) changes hash,
  and those that import it are recompiled against it, as `go test` does.
- **Assets**: versioned per Go version, with the Go BSD license. `pnpm --filter @typika/runtime-go build:assets`
  rebuilds them with the local Go, which must be the pinned version: `compile.wasm`, `link.wasm`, `std.pack` (the
  stdlib archives end to end, behind a JSON index), `LICENSE` and `manifest.json` (size, brotli size and
  SHA-256 of each file). 11.9 MB in brotli with Go 1.24.5.
- **gopls assets**: `build:assets` also builds gopls for `js/wasm`, from the versions pinned in `gopls/go.mod` and the
  patches of `gopls/patches/` ([0036](../decisions/0036-go-language-service.md)). Next to it: the sources of the
  standard packages of `STD_ROOTS` with `builtin`, and their `go list` metadata for `js/wasm`. They go in
  `assets/gopls/` with their own key and `gopls-manifest.json`, so that a gopls update does not invalidate the
  toolchain. Each file is gzip-compressed, with a `.gzip` suffix that no server turns into a `Content-Encoding`, and
  stays compressed in Cache Storage (`typika-gopls-<key>`): `DecompressionStream` decompresses it on each load.
  12.9 MB with gopls v0.20.0, plus `gopls-licenses.txt`. Run and the tests never load them.
- **Stdlib**: a closed set, defined by its roots in `std-roots.constant.ts` and completed by their dependencies (76
  packages with Go 1.24.5). A template only imports these packages, excluding `internal/`; any other import is a
  compilation error at run time, and `E_GO_IMPORT_UNAVAILABLE` in `template-check` and in the registry.
- **In the browser**: `@typika/runtime-go/browser` loads the assets (Cache Storage, progress per asset), then
  runs the driver in a worker kept for the session, with its archive cache. `run` and `test` send the worker the
  complete state of the FS. An interruption or the watchdog terminates the worker, and the next call creates a new one.
  The server serves the `.br` files precompressed by `build:assets` with `Content-Encoding: br`.
- **Outside the browser**: `@typika/runtime-go/node` loads the assets from disk and runs the same driver in
  Node. `template-check` uses it for the Go exercises. The `conformance/` suite compares its results with those of
  native `go test` on fixtures and on `strategy-go`.
- **Isolation**: no requirement. No `SharedArrayBuffer`, the runtime also runs in the embed.
- Compilation errors: `file:line:column: message`, paths relative to the project root after removing the
  FS prefix.
- No preview in V1 (no `net/http` server in the browser).
- Template constraint: standard library of the precompiled set only; no `cgo`, `go:embed` or
  `os/exec`.

### 6.4 `kotlin`

The Kotlin compiler is a JVM program; no official version runs in the browser. The code is
**compiled by a service, run in the browser**.

**Chain**

```
Project (app) ──POST /compile──▶ kotlin-compiler (service) ──▶ JS module
     │                                                           │
     └──────────── artifact passed to the session ◀──────────────┘
                              │
                     execution worker (runtime origin)
```

- The call to the service starts from the **app**, not from the runtime origin (see [security.md](./security.md): the
  runtime origin has no outgoing network access). The Kotlin session of the frame asks the app for each compilation
  over the same `MessagePort` (`CompileKotlin`, answered by `KotlinCompiled` or `KotlinCompileFailed`); the app
  compiles with its cache and sends the compilation back. It calls `/api/kotlin/compile` on its own origin, which its
  server relays to the service with per-IP rate limiting ([0029](../decisions/0029-kotlin-relay-rate-limit.md)).
- The service is in-house ([ADR 0019](../decisions/0019-kotlin-runtime.md)): a minimal HTTP server around
  `kotlin-compiler-embeddable`, with the stdlib and `kotlin.test` of the same version as the only libraries. It only
  compiles; no endpoint runs code.
- Two-phase compilation: sources to klib, then klib to an ES module with DCE and a source map. In `test` mode,
  sources and tests are compiled together and `main` is not called.
- **Target: JS.** The harness can run Wasm, but Wasm brings nothing in V1 (artifact three times heavier, no
  failure position). The target is a choice of the runtime, not of the template.
- `run` imports the produced module: `main` runs on load, `println` is captured as `Stdout`.
- `test` installs the `kotlin.test` adapter of the harness (`describe`, `it`, `xit`), imports the module, then runs the
  registered tests and emits the `TestEvent`s (§2.3). The file of a test class comes from the sources: its `package`
  declaration and its top-level classes. Tests run in registration order, file by file;
  `TestOptions.files` restricts to the tests of those files, `TestOptions.namePattern` follows the `browser-js` rule
  (regular expression on "suites name", otherwise substring; an excluded test is a `filtered` `TestSkipped`).
- **Failures.** The message is that of the exception; an exception other than an `AssertionError` is prefixed with its
  simple name (`IllegalStateException: cannot divide 1 by zero`), as in the `gradle test` report. `expected` and
  `actual` are taken from the form `Expected <…>, actual <…>.`. The stack is mapped back through the source map to the
  project files; `location` is the first frame in the test file, otherwise the first frame of the project.
- **Messages**: those of the `kotlin.test` asserter. On the JVM, `kotlin-test-junit5` hands `assertEquals`,
  `assertNotEquals`, `assertNull` and `assertNotNull` over to JUnit 5, which words them differently (`expected: <1> but was:
  <2>` for `Expected <1>, actual <2>.`); the other assertions and `fail` give the same text. A message that names
  a type also differs: the JVM writes `java.lang.String`, JS `String`.
- **In the browser**: `@typika/runtime-kotlin/browser`. The session receives a compiler (the app's, through the
  frame), then runs the artifact
  in a fresh worker per `run` or `test`, imported from a `blob:` URL. The worker is terminated at the end, on
  interruption or by the watchdog: no state from one execution to the next. `load` has nothing to download.
- **Outside the browser**: `@typika/runtime-kotlin/node` runs the artifact in a `node:vm` context without `process`,
  so that `println` goes through the harness console as in the browser. `template-check` uses it for the
  Kotlin exercises when `KOTLIN_COMPILER_URL` points to a service. The `conformance/` suite compares its results
  with those of `gradle test` (status, message after the JUnit 5 mapping above, `file:line` of the test
  frame), and the output of `main` with that of `gradle run`, on fixtures and on `strategy-kotlin`.
- **Isolation**: no requirement. No `SharedArrayBuffer`, the runtime also runs in the embed.
- Template constraint: no JVM-specific API (`java.*`), stdlib and `kotlin.test` only.

**Protocol**

A Typika-specific contract, implemented directly by the service. The client only depends on this contract: changing
the compiler or adding the Wasm target does not affect it.

```http
POST /compile
Content-Type: application/json

{
  "protocol": 1,
  "target": "js",
  "kotlinVersion": "2.4",
  "mode": "test",
  "files": [{ "path": "src/main/kotlin/Order.kt", "content": "..." }]
}
```

| Response | Body | Effect on the client |
|---|---|---|
| `200` | `{ "ok": true, "artifact": { "kind": "js", "code": "...", "sourceMap": "..." }, "diagnostics": [...] }` | Execution; warnings go to `Diagnostics` |
| `200` | `{ "ok": false, "diagnostics": [...] }` | `Diagnostics` then `errored` `RunFinished` (or `RuntimeCompileError` for `run`) |
| `400` | `{ "error": "..." }` | Request refused (protocol, target, Kotlin version, path): client bug, `KotlinCompilerUnavailableError` |
| `413` | `{ "error": "..." }` | "Project too large" diagnostic: `RuntimeCompileError` for `run`, `errored` run for `test` |
| `429` | `Retry-After` | `KotlinCompilerRateLimitedError { retryAfterSeconds }` |
| `503` | `{ "error": "..." }`, `Retry-After` if the queue is full | Queue full, or compilation process dead and restarted: `KotlinCompilerUnavailableError` |
| `504` | `{ "error": "..." }` | Compilation interrupted at the service timeout: `KotlinCompilerUnavailableError` |
| network | — | `KotlinCompilerUnavailableError` |

`mode: "test"` compiles the tests with the sources and does not call `main`; the harness stays on the browser side.
The diagnostics follow `DiagnosticSchema`, with paths relative to the project root. The service only accepts `.kt`
files with relative paths, 500 at most, and the Kotlin version it embeds (`GET /health` gives it). The artifact code
does not contain a `sourceMappingURL` comment: the source map comes alongside.

**Compilation cache**

- Key: `sha256(protocol + target + kotlinVersion + mode + files sorted by path)`.
- **Client cache**: IndexedDB, bounded LRU (§8), on the app origin. Rerunning the tests without changes, even
  after a reload, does not call the service again.
  The compilation client takes a `CompileCache`: IndexedDB in the app, none by default outside the browser. A failed
  compilation is cached like a success; a project that is too large, a `429` or a service error are
  not.
- **Precompiled artifacts**: the registry CI (`registry-tools build`) compiles each Kotlin template, without its
  `exercises/` folder, in `test` and `run` modes. It writes each compilation under its cache key in
  `artifacts/kotlin/<key>.json` of the registry, published next to the index. The app reads them at that address,
  relative to `TYPIKA_REGISTRY_INDEX_URL`, behind its IndexedDB cache and read-only: a missing or unreadable artifact
  counts as missing from the cache. Opening a template and running its tests costs no call to the service as long as
  the user has not changed anything: a change changes the key. The CI likewise compiles the start state of each
  exercise, in both modes ([0030](../decisions/0030-kotlin-exercise-artifacts.md)).
- **Server cache**: optional, in memory only (LRU), lost on restart. The service stays without storage.
- Compilation **on demand** (`run` / `test`), never while typing. The diagnostics of the Kotlin editor come from the
  last `run` / `test`, not from a language server (outside V1).

**Disabling**: if `KOTLIN_COMPILER_URL` is not configured, the public config has no `kotlinCompilerUrl`,
`RuntimeRegistry.get('kotlin')` fails with `RuntimeUnsupportedError` and the sandbox explains it without offering to
retry. The hub is prerendered at build time, before the config is known: it hides the Kotlin templates, variants and
facets once hydrated.

## 7. Errors

All are `Data.TaggedError`, in `packages/runtime-core/src/domain/errors/`.

| Error | Fields | Typical cause | Display |
|---|---|---|---|
| `RuntimeUnsupportedError` | `kind` | Runtime disabled (Kotlin without a service) or unknown | Template hidden; message if opened through a link |
| `RuntimeAssetLoadError` | `asset`, `cause` | Network, CDN, SRI failure, runtime chunk not found | Banner with "Retry" |
| `RuntimeBootError` | `kind`, `cause` | Initialization failure (WASM, worker) | Sandbox error screen |
| `RuntimeFsError` | `path`, `reason` | Invalid path, limit exceeded | Toast, file not written |
| `RuntimeCompileError` | `diagnostics` | Build / compilation error on `run` | Console + underline in the editor |
| `RuntimeProcessError` | `cause` | Worker crash, out of memory | Console, worker recreated |
| `RuntimeTimeoutError` | `limitMs` | Watchdog exceeded | Console: "Stopped after N s" |
| `KotlinCompilerRateLimitedError` | `retryAfterSeconds` | `429` | Toast with delay |
| `KotlinCompilerUnavailableError` | `cause` | Service unreachable | Toast, manual retry |

A test error (failing assertion) is **never** an Effect error: it is a `TestFailed`.

## 8. Limits

Initial values, centralized in `RuntimeLimit` (`packages/runtime-core/src/domain/constants/runtime-limits.constant.ts`),
to be adjusted after the spikes.

| Limit | Initial value | Enforced by |
|---|---|---|
| Files per project | 500 | `project` + `RuntimeFs` |
| Total project size | 10 MiB | `project` + `RuntimeFs` |
| Size of a file | 1 MiB | `project` |
| `test` timeout (complete run) | 30 s | Session watchdog |
| Per-test timeout | 5 s (can be overridden per test) | Test runner |
| `run` timeout | 30 s | Session watchdog |
| WASM memory (`go`) | 512 MiB max per instance | `WebAssembly.Memory` `maximum` |
| Console output kept | 1 MiB per run (circular buffer) | UI |
| Kotlin compilation request | 256 KiB of sources | Client + service |
| Kotlin compilation timeout | 15 s service, 20 s client | Service + client |
| Client compilation cache | 50 MiB, LRU | IndexedDB adapter |

The memory of a JavaScript worker cannot be capped reliably: we protect ourselves with the watchdog and by recreating
the worker on a crash, not with a quota.
