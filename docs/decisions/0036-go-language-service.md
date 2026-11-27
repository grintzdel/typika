# 0036 — Go language service: gopls compiled to WASM

**Status**: Accepted · 2026-11-27 · slice 1 of M8 · closes spike [R10](../spikes.md)

## Context

Go files only get keyword, snippet, project-word and import completion. Spike R10 ran gopls v0.20.0, compiled to
`js/wasm`, under Node: with two patches to `x/tools` and a JavaScript function that answers the `go` commands, it gave
the same answers as native gopls on `strategy-go`. Slice 1 of M8 measures it in the browser before the other slices
build on it.

Setup: the same patched gopls, in a worker, on a `localhost` page without COOP or COEP. Files come from `memory-fs` of
`packages/runtime-go`: the `strategy-go` project and the sources of the standard packages it reaches. The `go`
commands get the answers native `go` gave with `GOOS=js GOARCH=wasm`, recorded beforehand. Playwright 1.64 with
Chromium 156 and WebKit 27.2, on an Apple Silicon Mac, three runs per browser. Each run opens `quote_test.go` and
measures from `initialize` to the first completion after `checkout.`, then the later requests.

| | Chromium | WebKit | Chromium CPU ×4 |
|---|---|---|---|
| Fetch and decompress `gopls.wasm` (gzip, served locally) | 74–79 ms | 61–68 ms | 306–309 ms |
| `WebAssembly.compile` | 18–20 ms | 43–47 ms | 37–40 ms |
| Load 707 files into `memory-fs` | 30–32 ms | 29–37 ms | 123–126 ms |
| `initialize` → first completion | 0.90–0.93 s | 0.79–0.90 s | 3.4–3.8 s |
| Completion again / members after `).` | 2–3 / 10–12 ms | 2–4 / 7–8 ms | 8–9 / 38–39 ms |
| Hover / definition / references | 3 / 1–2 / 19–21 ms | 1 / 1 / 16–22 ms | 13–16 / 4–5 / 69–70 ms |
| Completion after an edit | 11–13 ms | 9–13 ms | 35–39 ms |
| Linear memory at the end | 365–420 MiB | 420–436 MiB | 365–416 MiB |

- **Same answers in both browsers** as native gopls: the 11 exported names of `checkout`, the members of `Quote`, the
  signature of `quoteFor`, the definition of `Standard` in `shipping_option.go` and its 6 references.
- **CPU ×4** throttles the page, not its workers: a fixed loop took the same time in a throttled worker. This column
  runs the same code on the main thread, where the loop takes 4.1 times longer.
- **WebKit crashes when file callbacks are synchronous.** `memory-fs` calls its callbacks before returning, and Go's
  `syscall/js` reenters the module from inside the call. gopls reads hundreds of files from concurrent goroutines.
  In WebKit, gopls then dies with a corrupted Go stack (`unexpected return pc`, `panic on system stack`), at a
  different point on each run. Deferring each callback with `queueMicrotask` removes the crash in all runs. Chromium
  survives synchronous callbacks, but the work then runs inside the `didOpen` call. The table uses deferred callbacks
  in both browsers. The cause, most likely the JS stack depth that nesting reaches, is not proven.
- **Memory**: `GOMEMLIMIT=256MiB` brings it to 308 MiB in both browsers. The first completion takes 6 to 9% longer
  in Chromium, with no measurable difference in WebKit.
  Under Node, gopls used 164 MiB: the browsers let the Go heap grow before collecting it.
- **Standard sources**: gopls loads the test variant of each package, so the `testing` closure of native `go test`
  comes in (`go/ast`, `go/parser`, `internal/fuzz`, `testing/internal/testdeps`). That makes 118 standard packages for
  `strategy-go`, not the 79 of [0018](0018-go-runtime.md). Their 690 compiled files weigh 6.3 MB raw, 1.25 MB in
  brotli and 1.7 MB in gzip.
- **Weight**: `gopls.wasm` is 52.7 MB raw, 7.8 MB in brotli and 11.5 MB in gzip.
- **Quota, by calculation**: the Go assets take 79 MB raw ([0027](0027-go-assets-delivery.md)). Adding gopls and the
  sources in gzip comes to about 92 MB, under the roughly 100 MiB WebKit gives the frame. Not measured in a
  third-party frame.

## Decision

- **Go: gopls compiled to WASM becomes the Go language service.** It meets the R10 criteria: on desktop, the first
  completion comes under 1 s after `initialize`, later requests under 25 ms. At CPU ×4, nothing crashes and later
  requests stay under 75 ms.
- **File callbacks are deferred** in gopls's worker, with `queueMicrotask`. The compiler's worker keeps synchronous
  callbacks, which work in WebKit.
- **`GOMEMLIMIT=256MiB`** by default in gopls's environment.
- **The standard sources follow gopls's package list**, the test variants included, not `STD_ROOTS` alone.
- **gopls and its sources stay compressed in Cache Storage** (gzip, decompressed with `DecompressionStream`), unlike
  the other Go assets.

## Consequences

- Slice 2 builds the 118-package source set and checks the quota in a real third-party frame. If it does not hold, the
  other Go assets also have to be stored compressed.
- Slice 4 starts gopls on demand and stops it when no Go file is open: 310 MiB is a lot next to `compile` and `link`.
- At CPU ×4, the first completion takes 3.4 to 3.8 s. The basic completions stay until gopls is ready (slice 5).
- The measurements ran on `localhost`, not on the runtime origin. Its CSP already allows `'wasm-unsafe-eval'`
  ([security](../specs/security.md)); slice 4 confirms it there.
- The WebKit crash cause stays a hypothesis. An upgrade of Go or WebKit reruns the browser test of slice 4.

## Rejected alternatives

- **Synchronous callbacks everywhere**: they crash gopls in WebKit.
- **Pinning the cause in WebKit first**: the workaround is two lines and costs nothing measurable.
- **Without `GOMEMLIMIT`**: 365 to 436 MiB, for a gain of a few dozen milliseconds on the first completion.
