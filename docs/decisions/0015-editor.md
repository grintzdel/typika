# 0015 — Editor: CodeMirror 6 and in-house TypeScript adapter

**Status**: Accepted · 2026-10-08 · supersedes [0008](0008-codemirror-6.md) · outcome of spike [R4](../spikes.md)

## Context

ADR 0008 chose CodeMirror 6 provided that TypeScript IntelliSense was good enough in it. Spike R4 compared
CodeMirror 6 (TS 6.0 language service in a worker through `@valtown/codemirror-ts`, `@typescript/vfs` and Comlink) and
Monaco 0.57, on the Strategy template extended to 22 files with cross imports.

Measurements (Chromium, production build, brotli; "mobile" = emulated Pixel 7, CPU ×4, 9 Mb/s, 150 ms RTT):

| | CodeMirror 6 | Monaco |
|---|---|---|
| Interactive editor, desktop / mobile | 55 ms / 769 ms | 174 ms / 1,699 ms |
| Language service ready, desktop / mobile | 326 ms / 2,202 ms | 527 ms / 3,311 ms |
| Median / p95 completion, desktop | 31 / 33 ms | 130 / 134 ms |
| Multi-file diagnostics shown | yes | no: the markers of a file are not recomputed when an imported file changes |
| Size, editor alone | 140 KiB | 1,035 KiB |
| Total size with language service and libs | ~1.15 MB (~0.9 MB without DOM) | ~2.05 MB |

The "completion < 200 ms after startup" criterion is met with a wide margin. WebKit gives figures of the same order;
Firefox could not be launched in the spike environment.

## Decision

**CodeMirror 6**, with a **TypeScript adapter written in the `editor` module** rather than `@valtown/codemirror-ts`
(unmaintained since September 2025). We keep `@typescript/vfs` and Comlink. The adapter adds what the package does not
offer: auto-import (`includeCompletionsForModuleExports` and application through `getCompletionEntryDetails`),
signature help, file deletion, diagnostics rerun when a file is opened, lint delay of 300 ms.

- **Two-stage loading**: the editor shows first, the worker starts next and the TS extensions are enabled through a
  `Compartment`. The editor is usable 270 ms (desktop) to 1.4 s (mobile) before the language service.
- **Libs**: the worker loads `lib.es2022` without DOM (33 KiB instead of 287), plus the declaration of `console` and
  `vitest`. The `vitest` one is emitted at build time from the sources of `@typika/test-runner` (implemented in M1). The `browser-js` runtime has no DOM: a template that
  needs one goes through the preview.
- **TypeScript version**: the worker is pinned on `typescript@6.0.x`. TS 7, native, has no JS API usable in a
  browser; the templates, for their part, check their types with TS 7 outside the sandbox.
- **Embed**: editor without language service by default (~140 KiB). IntelliSense loads on demand.

## Consequences

- The embed stays light, which matters for a blog page.
- About 200 lines of adapter to write and maintain in M1, tested like the rest of the `editor` module.
- The diagnostics of the sandbox (TS 6) can differ from those of the CI (TS 7). The health CI is authoritative; the
  gap is tracked at each version upgrade.
- The language service and Lezer are in JavaScript: the app CSP does not need `'wasm-unsafe-eval'`.

## Rejected alternatives

- **Monaco**: completion 4× slower, 2× heavier, and cross-file diagnostics to fix ourselves.
- **`@valtown/codemirror-ts` as is**: no auto-import, no file deletion, no more updates.
