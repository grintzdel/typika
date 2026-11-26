# 0018 — Go runtime: the Go toolchain compiled to WASM

**Status**: Accepted · 2026-10-08 · outcome of spike [R7](../spikes.md) · Firefox to check

## Context

The `go` runtime must compile, run and test the Go variants of the catalog in the browser, with a `go test -json`
output ([runtimes](../specs/runtimes.md)). Two options were in the running. Spike R7 ran them on `strategy-go`
(10 files, 12 subtests, two exercises) and on a concurrent relay (goroutines, `context`, `t.Parallel`), with
Go 1.24.5.

**A — Yaegi** (interpreter, master of 2026-02-09, last release in April 2024, Go 1.22 stdlib symbols): 5.7 MB in
brotli, ~180 ms per run. But it has four defects on a single ten-file template:

- `fmt.Printf("%s", order.Subtotal())` prints `{%!s(int64=3250) EUR}` instead of `32.50 EUR`: the `String()` method of
  an interpreted result is lost. The output is wrong, without any error.
- `t.Errorf` places the failure in `value.go:368`, not in the test file.
- Black-box tests (`package checkout_test`) fail with "import cycle not allowed".
- A `const` that converts to a type declared in another file of the package causes an internal panic
  ("incomplete type").

**B — Toolchain**: Go's `cmd/compile` and `cmd/link`, compiled to `js/wasm`, driven as `go build` / `go test` would
do it (package order, `importcfg`, generated `_testmain.go`), on an in-memory FS. The program produced is a `js/wasm`
binary run in the same worker. Measurements (Playwright, Chromium 156 and WebKit 27.2, worker, page without COOP or
COEP):

| | Chromium | WebKit | Chromium CPU ×4 |
|---|---|---|---|
| `test` build of `strategy-go` (compile ×4 + link) | 250–300 ms | 240–310 ms | 1.1–1.2 s |
| `run` build | 430–500 ms | ~310 ms | ~1.7 s |
| Test run | 15 ms | 14 ms | 70 ms |
| Restart after `worker.terminate()` of an infinite loop | 270 ms | 475 ms | — |

- **Native fidelity**: same outputs, same reds and greens as `go test` on the four exercise states, exact messages and
  `file:line`, stdlib generics, goroutines, `context`, `t.Parallel`. `-test.v=test2json` produces the stream that
  `test2json` converts without loss.
- **No `SharedArrayBuffer`**: `crossOriginIsolated` is false and `SharedArrayBuffer` absent, and everything works. The
  Go runtime therefore runs in an embed.
- **Size**, in brotli: `compile.wasm` 5.5 MB, `link.wasm` 1.95 MB, precompiled stdlib 4.2 MB (76 packages: `fmt`,
  `strings`, `sort`, `slices`, `maps`, `sync`, `time`, `context`, `encoding/json`, `testing`…). Total: 11.7 MB,
  downloaded once then served by the Service Worker cache. The generated `_testmain.go` provides its own
  implementation of `testDeps`: without `testing/internal/testdeps`, 44 packages go away (`go/ast`, `internal/fuzz`…).
- **Memory**: 24 to 28 MiB for `compile`, 96 MiB for `link`, 8 MiB for the test binary.
- Compilation errors come out in the `file:line:column: message` format.

## Decision

- **The `go` runtime ships the official Go toolchain compiled to WASM** (option B). Yaegi is rejected: a wrong output
  without an error is unacceptable for a learning tool.
- **The runtime does the work of the `go` command**: package graph of the module, `importcfg`, discovery of the
  `TestXxx`, generation of the `_testmain.go`, compile and link, cache of the archives by source hash.
- **One Go version per asset version.** The `go.mod` of the templates declares the same minor version. Upgrading
  means rebuilding the assets; the stdlib archives and the generated `testDeps` depend on it.
- **The available stdlib is a precompiled, closed set**, versioned with the assets. The registry CI refuses a template
  that imports a package outside this set.
- **The Go runtime is allowed in an embed.** It does not require isolation, unlike what ADR
  [0016](0016-isolation-and-embed.md) left open.

## Consequences

- Heavy first load (11.7 MB, ~10 s at 9 Mb/s): the runtime progress bar and the cache are essential (R3). Later runs
  cost 0.3 to 1.2 s depending on the machine.
- Go templates are limited to the standard library of the precompiled set: no third-party modules, no `cgo`, no
  `go:embed`, no `net/http` server, no `os/exec`. The rest of the language is available.
- The driver (build plan, `_testmain.go`, `test2json` conversion) is Typika code to maintain and to test against
  native `go test`, like the conformance suite of the `test-runner`.
- Go's BSD license applies to the redistributed assets: its text comes with the `.wasm` files and the stdlib.
- **To check by hand**: Firefox (Playwright could not launch it).

## Rejected alternatives

- **Yaegi**: light and fast, but unfaithful to Go on ordinary code, and poorly maintained.
- **Go compilation service** (like Kotlin): a server to operate and protect, when the browser is enough.
- **The whole stdlib**: weight for packages no template uses; the set grows on demand.
