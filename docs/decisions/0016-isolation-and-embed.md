# 0016 — Cross-origin isolation and embed

**Status**: Accepted · 2026-10-08 · outcome of spike [R2](../spikes.md) · Firefox and real Safari to check

## Context

`SharedArrayBuffer` only exists in an isolated context (`crossOriginIsolated`), which requires COOP and COEP. The embed
shows in the page of a third-party site that sets no header, and the runtime frame is served from a dedicated origin
([0013](0013-dedicated-runtime-origin.md)). The question: which runtimes can run in an embed, and with which headers?

Spike R2 set up three distinct sites (third-party host without headers, app `/embed/strategy`, runtime) and the real
chain: host → embed → runtime frame (`sandbox`, `allow="cross-origin-isolated"`) → esbuild-wasm worker that bundles the
Strategy template, runs its tests and `main.ts`. 56 header combinations per browser, on Chromium 156, Chrome 154 and
WebKit 27.2 (Playwright).

Results:

- **In an embed, no isolation is possible.** `crossOriginIsolated` stays false at every level, whatever the headers of
  the app and the runtime: only the host page, at the top level, could get it.
- **`browser-js` does not need it.** esbuild-wasm runs without `SharedArrayBuffer` (initialization ~60 ms, template
  build ~300 ms on Chromium); the 11 tests pass; the hard kill through `worker.terminate()` works.
- **`credentialless` is worthless on WebKit**: it is ignored, the page is never isolated. `require-corp` isolates on
  both engines.
- **Without `allow="cross-origin-isolated"`**, Chromium does not isolate the cross-origin runtime frame, even in the
  sandbox.
- **Without `Cross-Origin-Resource-Policy: cross-origin`** on the runtime frame, the frame is blocked as soon as its
  parent sets a COEP; a worker script served without COEP is blocked the same way.
- **The storage of the embed is partitioned by host site** (IndexedDB on both engines; `localStorage` not partitioned
  in Playwright's WebKit).

## Decision

- **The embed is not isolated**: `/embed/*` sets neither COOP nor COEP. These headers bring nothing there and only add
  risks of blocking. It keeps `Cross-Origin-Resource-Policy: same-origin` and `frame-ancestors *`.
- **The embed runs `browser-js`**. A runtime that requires `SharedArrayBuffer` (according to spikes R7 and R8) does
  not start there: the embed shows "Open in Typika". This is the normal case, not an error.
- **COEP = `require-corp`** wherever we isolate (sandbox, comparison, sharing, runtime origin). `credentialless` is
  rejected.
- **Runtime origin**: COEP `require-corp` and CORP `cross-origin` on **all** responses, including worker scripts and
  `.wasm` files.
- **The runtime iframe keeps `allow="cross-origin-isolated"`**.
- **The embed does not rely on `localStorage`**; it has no local persistence anyway.

## Consequences

- Blogs have nothing to configure to embed a TS or JS template.
- Go and Kotlin templates may not run in an embed; the user is sent to the app. To settle per runtime at the outcome
  of R7 and R8.
- The first run in an embed downloads esbuild-wasm: 2.68 MB in brotli. The runtime only starts at the first
  interaction (already planned); the CDN and the cache belong to R3.
- An E2E test checks the headers of each route in M1, and in M5 that the embed runs a template in a host page without
  headers.
- **To check by hand**: Firefox (Playwright could not launch it) and real Safari (Playwright's WebKit is only a proxy
  for it), including the partitioning of `localStorage`.

## Rejected alternatives

- **COOP + COEP on the embed**: no isolation obtained in a third-party page, and blocked resources on top of that.
- **COEP `credentialless`**: more flexible for third-party resources, but without effect on WebKit.
- **Asking host sites to set COOP/COEP**: contrary to the goal of a zero-configuration embed, and it would often break
  the rest of their page.
