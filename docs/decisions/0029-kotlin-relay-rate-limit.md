# 0029 — Kotlin compilation: relayed and rate-limited by the app server

**Status**: Accepted · 2026-10-13 · slice 3 of M6 · addresses R9 · complements [0019](0019-kotlin-runtime.md) and
[0028](0028-kotlin-compilation-workers.md)

## Context

The `kotlin-compiler` service compiles untrusted code and is expensive: about one second of CPU and several hundred
MiB per compilation ([0028](0028-kotlin-compilation-workers.md)). It bounds its own concurrency, queue, body and
timeout, but does not tell clients apart: a single machine can fill the whole queue and make the service respond `503`
to everyone else. [security §3.3](../specs/security.md) requires per-IP rate limiting; the hosting guide left the
choice between a third-party Caddy module and limiting in the service (R9).

Three constraints weigh on this choice:

- **The call starts from the app**, not from the runtime frame, which has no outbound network access
  ([runtimes §6.4](../specs/runtimes.md)). It must therefore target a URL that the app's CSP allows.
- **The app runs without Caddy** in dev (Vite server) and in the production E2E (`node dist/node/main.js`). Routing
  carried by Caddy alone leaves these two contexts without a path to the service.
- **Caddy does not rate-limit** without a third-party module: we would have to build and maintain a separate Caddy
  image (`xcaddy` + `caddy-ratelimit`).

## Decision

- **The app server relays `POST /api/kotlin/compile`** to the service designated by `KOTLIN_COMPILER_URL`, an internal
  address that is never exposed. The public config only gives `kotlinCompilerUrl: "/api/kotlin"`: the call stays on
  the app origin, without CORS and without an extra entry in `connect-src`. The same relay runs in the Vite dev server.
- **Per-IP rate limiting in this relay**: a token bucket per client, 20 compilations per minute and a burst of 10 by
  default (`TYPIKA_KOTLIN_RATE_PER_MINUTE`, `TYPIKA_KOTLIN_RATE_BURST`). Beyond that: `429` and `Retry-After`. At most
  10,000 clients tracked; full buckets are forgotten first.
- **The client's IP** is that of the connection, or the last `X-Forwarded-For` when `TYPIKA_TRUST_PROXY=true`: Caddy
  appends the address it sees. Only enable it behind a proxy that rewrites this header.
- The relay also refuses what the service would refuse anyway, before calling it: another route (`404`), another method
  (`405`), an `Origin` from another site (`403`), a body over 256 KiB (`413`). It forwards the service's status and
  `Retry-After`. It responds `503` with `Retry-After: 5` if the service is unreachable or does not answer within 25 s.
- The service stays reachable only by the app, on the internal Compose network, without a Caddy route.

## Consequences

- Deviation from the roadmap, which planned `/api/kotlin/*` "routed by Caddy". Caddy stays the official image and only
  sees `web`.
- Compilations go through Node: a few tens of KiB of JSON per call, at no notable cost next to the compilation itself.
- The counter lives in the `web` process: it restarts from zero at each restart and is not shared between several
  instances. One instance per deployment is enough in V1.
- The client cache (IndexedDB) and the precompiled artifacts (slice 4) avoid most calls: the limit only affects
  repeated changes.
- An instance that exposes the service elsewhere (Vercel, [hosting](../guides/hosting.md) §5) must put its own rate
  limiting in front of it.

## Rejected alternatives

- **Caddy + `caddy-ratelimit`**: a custom Caddy image to build and maintain, and nothing in dev or in the production
  E2E.
- **Limiting in the Kotlin service**: more JVM code in the service exposed to untrusted code, and a relay was still
  needed in dev.
- **No per-IP limiting**: the service's bounded queue protects the machine, not the other users.
