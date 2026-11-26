# 0019 — Kotlin runtime: an in-house compilation service, JS target

**Status**: Accepted · 2026-10-08 · outcome of spike [R8](../spikes.md) · supersedes [0002](0002-kotlin-compilation-service.md)

## Context

The `kotlin` runtime must compile the Kotlin variants of the catalog, then run the program and its `kotlin.test` tests
in the browser ([runtimes](../specs/runtimes.md)). ADR 0002 planned a service built on `kotlin-compiler-server`
(JetBrains). Spike R8 wrote `strategy-kotlin` (16 files, 11 tests, two exercises) and compiled it with Kotlin 2.4.21
in three ways: the `kotlinc-js` / `kotlinc-wasm` CLI, `kotlin-compiler-server` (master of 2026-09-29, Kotlin
2.4.21-RC) in a container, and a minimal service of about a hundred lines that calls the compiler in process. The
artifacts were run in a worker under Chromium 156 and WebKit 27.2 (Playwright).

**`kotlin.test` outside the JVM works.** The compiler generates the test registration: at load (JS) or on the call to
`startUnitTests()` (Wasm), each test class becomes a suite and each `@Test` a test, passed to the `kotlin.test`
adapter. A harness of about forty lines provides `describe` / `it` ("Jasmine" adapter), runs the tests and emits
events. Result on the four exercise states, in JS as in Wasm, in both browsers: exactly the same greens and reds as
`gradle test` on the JVM, with the same messages (`Expected <12.90 EUR>, actual <0.00 EUR>.`). In JS, the source map
places the failure on the exact line of the test (`ExpressShippingTest.kt:13:9`). Run: 5 to 25 ms.

**`kotlin-compiler-server` does not fit as is**:

- Its image does not start on `master`: the Dockerfile omits the Spring Boot loader (`NestedFileSystemProvider not
  found`). Fixed in one line for the spike.
- Its JS and Wasm libraries only contain the stdlib: without adding `kotlin-test-js` and `kotlin-test-wasm-js`, no
  test compiles. Its `/test` endpoint runs JUnit **on the server**, the opposite of [0001](0001-browser-first.md).
- It also exposes `/run` (JVM execution), completion and Compose: attack surface for features Typika does not use.
  Image: 1.73 GB.
- Its output is cut for play.kotlinlang.org: JS in UMD with lines injected at a fixed position, Wasm in base64 inside
  the JS. File paths with `/` make the compilation fail.

**The minimal service** (JDK `HttpServer`, `kotlin-compiler-embeddable`, `kotlinx-serialization`) does the same
two-phase compilation (klib, then JS or Wasm with DCE), with the project paths, as an ES module with a source map,
without calling `main` in test mode. Image: 628 MB, startup in 0.6 s, 71 to 95 MiB at rest.

Measurements on `strategy-kotlin` (sources and tests), capped container, Apple M4 Pro host. A VPS vCPU is slower:
count about 1.5 to 2 times these latencies.

| Container | 1st compilation | Warm, alone | Saturated throughput (c = 8) | p95 at c = 8 | Max memory |
|---|---|---|---|---|---|
| Minimal service, 2 vCPU, 1 GiB | 5.9 s | 0.9–1.3 s | 2.2 compil./s | 5.2 s | 656 MiB |
| Minimal service, 4 vCPU, 2 GiB | 5.0 s | 0.8–1.2 s | 4.4 compil./s | 2.2 s | 1,021 MiB |
| Minimal service, 1 vCPU, 1 GiB | 10.8 s | 1.9–2.4 s | 1.3 compil./s | 8.6 s | 562 MiB |
| Minimal service, 2 vCPU, 512 MiB | 5.7 s | 0.9–1.3 s | 1.0 compil./s | 12.3 s | 512 MiB (saturated) |
| `kotlin-compiler-server`, 2 vCPU, 1 GiB | 6.2 s | 1.0–1.7 s | 1.75 compil./s | 10.0 s | 644 MiB |

- Wasm compiles at the same cost as JS (0.9–1.4 s warm). A compilation error responds faster (0.4 s warm): the
  second phase does not take place.
- `strategy-kotlin` artifact in brotli: JS 20 KB (+ 11 KB of source map), Wasm 65 KB.
- Diagnostics come out in the `file:line:column` format, relative to the project. A `java.*` API is refused at
  compile time (`unresolved reference 'java'`).

**CheerpJ** (`kotlinc` in a WASM JVM) is rejected without a prototype: the Community edition forbids self-hosting and
redistribution, which rules out third-party instances, like WebContainers in R1. The compiler alone weighs 55 MB in
brotli, without the JVM.

## Decision

- **An in-house compilation service**, `services/kotlin-compiler`, on `kotlin-compiler-embeddable` (Apache 2.0). No
  `kotlin-compiler-server`. The service only compiles: no endpoint runs code.
- **JS target only in V1.** It is three times lighter than Wasm, has source maps that place failures, and requires
  neither Wasm GC nor exception handling from the browser. The harness already handles Wasm: adding it later touches
  neither the templates nor the protocol.
- **The target is not a template choice.** The `runtime.target` field leaves the manifest: the common code of the
  templates compiles for both targets, the runtime chooses.
- **Closed libraries**: stdlib and `kotlin.test` of the compiler version, nothing else. One Kotlin version per service
  version.
- **Test mode**: sources and tests are compiled together, `main` is not called. The runtime harness provides the
  `kotlin.test` adapter and translates the results into `TestEvent`.
- **The Kotlin runtime is allowed in an embed.** It runs a JS module in a worker, without `SharedArrayBuffer`: the
  measurements above were made in a page without COOP or COEP. As for Go, this settles the question that ADR
  [0016](0016-isolation-and-embed.md) left open.
- **Reference sizing**: 2 vCPU, 1 GiB, 2 concurrent compilations, a warm-up compilation at startup. Below 1 GiB, the
  garbage collector collapses as soon as two compilations run at once.

## Consequences

- The principle of [0001](0001-browser-first.md) keeps a single exception: Kotlin compilation. The compiled code only
  runs in the browser.
- A service to maintain, but a small one: the compiler is a dependency, the rest fits in one file. Upgrading Kotlin
  means rebuilding the image and recompiling the precompiled registry artifacts (`pnpm registry:build --force`).
- The first compilation after startup costs 5 to 11 s (JVM JIT). The warm-up compilation does it before the first
  request.
- A "Run" or a changed test costs about 1 s on the reference instance, 2 to 4 s under load. The cache by source hash
  and the precompiled registry artifacts ([runtimes](../specs/runtimes.md) §6.4) avoid most calls.
- A compilation cannot be interrupted from another JVM thread: the service timeout (15 s) requires either a separate
  compilation process or a restart of the container. To settle in M6 with R9.
- Kotlin templates: no `java.*`, no `kotlinx.coroutines` (outside the stdlib), and test names without `.`, which the
  JVM refuses in method names (see the [authoring guide](../guides/template-authoring.md)).
- **To check by hand**: Firefox (Playwright could not launch it).

## Rejected alternatives

- **`kotlin-compiler-server`**: it works once fixed, but it brings JVM execution, Compose and an output format to undo,
  for an image three times heavier and a lower throughput.
- **CheerpJ**: license incompatible with self-hosting, 55 MB of compiler.
- **Wasm target by default**: no measured gain on execution, an artifact three times heavier, no failure position
  without DWARF, and `main` run at load even in test mode.
- **Removing Kotlin from V1**: unnecessary, the spike criteria are met.
