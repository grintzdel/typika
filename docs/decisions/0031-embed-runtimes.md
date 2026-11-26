# 0031 — Runtimes in the embed: all three, in a secure context

**Status**: Accepted · 2026-10-19 · slice 4 of M5 · complements [0016](0016-isolation-and-embed.md),
[0018](0018-go-runtime.md) and [0019](0019-kotlin-runtime.md)

## Context

The `/embed/<name>` embed is displayed in a third-party site's page, without cross-origin isolation
([0016](0016-isolation-and-embed.md)). 0018 and 0019 allow Go and Kotlin in the embed, since neither uses
`SharedArrayBuffer`. But no spike had run these runtimes in the real chain: host page, then app page without COOP or
COEP, then runtime frame. Slice 4 must decide before building the embed. Two questions remain open: what the 12 MB of
Go assets cost in a blog page, and what happens to Kotlin compilations when the traffic comes from third-party sites.

A spike set up this chain on the production build: app on `localhost:3100`, runtime on `127.0.0.1:3100`, Kotlin
service and test registry. Each host page is a distinct site, `blog.localhost` or `other.localhost`. Lacking an
`/embed` route, the `/play/<name>` page is served in the iframe without COOP or COEP, with `frame-ancestors *`. The
spike ran in Playwright's Chromium and WebKit.

Results, identical in both engines unless stated otherwise:

- **All three runtimes run.** `crossOriginIsolated` is false in all three frames. The 12 tests of `strategy-go` and
  the 11 of `strategy-kotlin` pass.
- **Go keeps its assets per host site.** The first run downloads the three assets, 79.3 MB raw, and stores them in the
  runtime frame's Cache Storage. A reload on the same host downloads nothing more. On another host site, the three
  assets are downloaded again, because the browser partitions storage by top-level site.
- **Kotlin runs without compiling as long as nothing is modified.** The tests of `strategy-kotlin` pass on the
  precompiled artifact, in 85 to 108 ms, without any call to the relay. After a change, a call to
  `/api/kotlin/compile` responds `200`, and the tests pass again in 1.9 to 2.4 s. The request starts from the app
  page: its `Origin` is the app's, and the relay accepts it ([0029](0029-kotlin-relay-rate-limit.md)).
- **An `http` host page breaks everything silently.** A context is secure only if all its ancestors are. Under an
  `http` host, the app and the runtime frame lose `caches` and `crypto.subtle`, which the Go loader depends on
  ([0027](0027-go-assets-delivery.md)). Go does not start, and its buttons stay on "Loading the runtime…".
  `browser-js` and Kotlin say they are ready, but their tests never return a result. No error is displayed.
- **Artifact of the local test bench**: under a third-party host, Chromium denies the app access to the registry
  served on a loopback address ("Local Network Access"). This is not the case in production, where the registry is
  public. The spike disabled this check.

## Decision

- **The embed runs the three V1 runtimes**: `browser-js`, `go` and `kotlin`. The rule of 0016 does not change: a
  runtime that required isolation would not start there, but no V1 runtime is in that case.
- **The embed requires a secure context.** At startup, it checks `isSecureContext`. If it is false, no runtime starts:
  the code stays readable, and the bar offers "Open in Typika", with the reason (the host page is not served over
  HTTPS). This rule applies to all runtimes, since they all fail without displaying anything.
- **Go starts only on click.** `run=auto` is ignored for a Go template. Starting on its own would download 12 MB for
  every visitor of a blog page containing the embed, before they even see it. The first click shows the runtime's
  progress bar, as in the sandbox.
- **Kotlin goes through the existing relay.** Nothing is added for the embed: same `Origin`, same per-IP limit. The
  compilation cache stays in memory during the session, since the embed has no local persistence.

## Consequences

- An embedded Go template costs 11.9 MB in brotli on the first run, once per host site and per assets version. Each
  host site then stores 79 MB in its Cache Storage. In this context, Playwright's WebKit reports a 2 GiB quota, while
  [0027](0027-go-assets-delivery.md) measured about 100 MiB for the frame. Real Safari's quota is still to be
  measured, as for 0016.
- An unmodified Kotlin embed never calls the service. A reader's changes count toward their per-IP limit, as in the
  app.
- An `http` host page displays "Open in Typika" instead of Run and Tests. Blogs served over HTTPS are not affected.
- The E2E tests of slice 4 serve the host page on a `*.localhost` site: an `http` host on another name would lose the
  secure context. On the production build, Chromium runs without the "Local Network Access" check, to reach the test
  registry. One case checks that an insecure host shows the fallback.
- [security §3.6](../specs/security.md) and [ui §13](../specs/ui.md) restate these rules.

## Rejected alternatives

- **Embed limited to `browser-js`**: Go and Kotlin run, as the measurements show. Sending them to the app would remove
  half of the catalog from the embed, without any security gain.
- **Read-only Kotlin in the embed**: this would avoid any compilation coming from third-party sites. But the relay's
  per-IP limit already treats this traffic like the app's, and an embed where nothing can be modified loses its point.
- **`run=auto` allowed for Go**: 12 MB downloaded when the page opens, for readers who will not necessarily click.
- **Letting it fail over `http`**: the reader would see a stuck runtime or tests that never finish, without
  explanation.
