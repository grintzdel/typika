# 0027 — Go assets: served by the image, kept in Cache Storage

**Status**: Accepted · 2026-10-12 · slice 2 of M4 · addresses R3 for the `go` runtime

## Context

The `go` runtime loads `compile.wasm`, `link.wasm` and `std.pack`: 79 MB raw, 11.9 MB in brotli
([0018](0018-go-runtime.md)). [runtimes §5](../specs/runtimes.md) planned assets served from `TYPIKA_ASSETS_BASE_URL`
(a CDN by default) and cached by a Service Worker on the runtime origin. At slice 2, the app must serve them, a reload
must not download them again, and a bar must show the first download.

## Decision

- **The Docker image builds and serves the assets.** The build step copies Go 1.24.5 from the `golang` image pinned by
  digest, then runs `pnpm --filter @typika/runtime-go build:assets`. The runtime frame build copies the files under
  `/runtime/assets/go/<key>/`, where `<key>` is the beginning of the asset manifest's key. The URL changes when the
  assets change: the server serves them as `immutable`.
- **Precompressed brotli.** `build:assets` writes a `.br` next to each file. The Node server serves it with
  `Content-Encoding: br` when the request accepts it, and the raw file otherwise. Caddy only compresses in zstd and
  gzip, and does not recompress a response that already has its encoding.
- **Cache Storage, without a Service Worker.** The runtime loader, in the frame, reads each asset from the
  `typika-go-<key>` cache and downloads it only when it is missing. It deletes the `typika-go-*` caches of other keys.
- **SHA-256 checked after the download.** The manifest embedded in the frame gives the size and SHA-256 of each file.
  The loader checks the hash before caching the asset. We do not use the `integrity` option of `fetch`: the browser
  then reads the whole body before returning the response, and the progress bar would stay empty.
- **Progress**: `load` emits the raw size of each asset from the start, then the bytes received. The app adds them up
  and shows the bar while the runtime starts.

## Consequences

- No `TYPIKA_ASSETS_BASE_URL` for now: an instance serves its own assets. The runtime receives a base URL, and a CDN
  can provide it later without touching the loader.
- The image grows by about 92 MB (raw files and `.br`). Its build requires Go and takes about 100 s more, mostly for
  the brotli compression.
- WebKit gives about 100 MiB of Cache Storage to the frame, which is a third-party context. The Go assets take 79 MB of
  it. A second heavy runtime will have to store its assets compressed or share this quota another way.
- An ephemeral WebKit context (Playwright's by default) clears Cache Storage on reload. The E2E that checks the cache
  therefore runs in a persistent profile, like a real browser.
- `esbuild.wasm` stays on the HTTP cache: its URL is hashed by Vite and it weighs only 2.6 MB in brotli.

## Rejected alternatives

- **Service Worker**: it adds a lifecycle (the first load is not controlled, updates and `clients.claim` have to be
  handled) and a script to serve and test. All that to do cache-first on URLs that never change, which Cache Storage
  does directly from the frame. The Service Worker is still planned for the `browser-js` preview
  ([runtimes §6.1](../specs/runtimes.md)).
- **CDN right away**: we would have to publish an asset archive per version and keep it aligned with the app, while no
  public instance exists yet.
- **HTTP cache alone**: browsers evict large files early, and a forced reload ignores it.
- **On-the-fly compression by Caddy**: 17.6 MB in gzip and 16.4 MB in zstd (default levels), above the 12 MB
  criterion, and each request recompresses 79 MB.
