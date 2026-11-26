# Security

Status: spec · V1 threat model

By design, Typika runs code it did not write: third-party templates, share links, code changed by the user. Security
rests on one principle: **the code that runs never shares an origin with what has value** (GitHub token, local
projects, session).

## 1. Assets to protect

| Asset | Where it lives |
|---|---|
| The user's GitHub token | Memory and `sessionStorage` of the app origin |
| Local projects | IndexedDB of the app origin |
| Integrity of the official templates | Registry `typika-app/registry`, repos `typika-app/*` |
| Availability of the Kotlin compilation service | `kotlin-compiler` container |
| Reputation of the instance | Domain of the instance (phishing, hosted content) |
| The visitor's browser | CPU / network resources consumed by the code that runs |

## 2. Boundaries

```
App origin             : UI, IndexedDB, GitHub token. Never runs user code.
Runtime origin         : workers, WASM, preview. Runs user code. Holds no secret.
Web service            : static + POST /api/github/token. Stores nothing.
kotlin-compiler service: compiles untrusted code. Does not run the compiled code. No outbound network.
```

### 2.1 Dedicated runtime origin

- `TYPIKA_RUNTIME_ORIGIN` must be an origin different from the app. Two levels:
  - **Instance open to the public**: a **different site** (distinct registrable domain, on the model of
    `googleusercontent.com`). A subdomain stays "same-site": `SameSite` cookies and some protections do not separate
    it from the app.
  - **Private instance** (personal or team use, restricted access): a subdomain is tolerated. The app storage
    (IndexedDB, GitHub token) stays isolated by origin; the residual risk is on same-site cookies, which the app uses
    only for the OAuth state. The app shows a warning at startup in this configuration.
  - Runtime origin identical to the app origin: refused at startup.
- The app loads the runtime frame (`/runtime/frame.html`) in an iframe:
  `<iframe sandbox="allow-scripts allow-same-origin" allow="cross-origin-isolated">`. `allow-same-origin` is safe
  here since the origin of the frame is different from the app origin; it is required by the Service Worker and the
  asset cache.
- The preview of a template is an iframe nested in the runtime frame, with `sandbox="allow-scripts allow-forms
  allow-modals"`.
- The runtime frame **never** receives the GitHub token, nor the content of projects other than the one that runs.

### 2.2 App ↔ runtime channel

- A `MessageChannel` is set up at load: a single initial `postMessage`, with an explicit `targetOrigin` (never `*`).
  On the frame side, `event.origin` is checked against the allowed list.
- All messages are validated by Effect Schema on both sides; an invalid message is ignored and logged.
- The protocol only exposes the operations of `RuntimeSession` ([runtimes.md](./runtimes.md)). No operation lets the
  frame read the app state.

## 3. Threats and mitigations

### 3.1 Untrusted code in the browser

| Threat | Impact | Mitigation |
|---|---|---|
| The code that runs reads the token or the projects | GitHub account theft, code leak | Separate runtime origin (§2.1); the token does not leave the app origin |
| The code exfiltrates data or attacks a third party from the visitor's browser (mass requests, mining) | Abuse attributed to the instance, visitor penalized | CSP of the runtime origin: `connect-src` limited to the asset CDN and `'self'`; no network access for the code in V1; CPU watchdog ([runtimes.md](./runtimes.md) §4) |
| Infinite loop, massive allocation | Frozen tab | Execution in a worker, `terminate()` on interruption, timeouts, WASM memory cap |
| Frame navigates to a phishing page | Fake sign-in screen on a Typika origin | Preview without `allow-top-navigation`; runtime origin without any sign-in UI or branded content |
| Share link that runs code on opening | Unwanted execution | No automatic execution outside registry templates (§3.4) |

### 3.2 Malicious templates in the registry

| Threat | Impact | Mitigation |
|---|---|---|
| A template adds malicious code after acceptance | Code run by every visitor | The registry pins each template on a **commit SHA**, not a branch; every update goes through a reviewed PR |
| Compromised npm dependency (typosquatting, hijacked package) | Execution in the sandbox and for those who run `typika create` | Lockfile required; minimal dependencies (review rejects unjustified dependencies); Renovate with a quarantine delay on new versions |
| `postinstall` scripts | Execution at install (CLI) | No `npm install` in the sandbox ([ADR 0017](../decisions/0017-node-runtime.md)); the CLI installs nothing and runs nothing |
| Compromised ESM CDN (`browser-js`) | Code injected into the dependencies | Pinned versions; Typika's own assets with SRI; the residual CDN risk for third-party dependencies is accepted and documented |
| Markdown tour containing HTML or JavaScript | XSS on the app origin | Markdown rendered **without raw HTML**, sanitized output, external links with `rel="noopener noreferrer"`, no `javascript:` URL |
| Misleading third-party template (fake "official") | Abused trust | "Official" badge reserved for `typika-app/*`; the others are labeled "Community" |
| Health CI that runs a malicious template | Theft of CI secrets | The health CI runs in a job without secrets, without a write token, in a headless browser |

### 3.3 Kotlin compilation service

| Threat | Impact | Mitigation |
|---|---|---|
| Denial of service (mass requests, long compilations) | Service unavailable, VPS saturated | Per-IP rate limiting in the `/api/kotlin` relay of the app server ([0029](../decisions/0029-kotlin-relay-rate-limit.md)); queue with bounded concurrency; 15 s timeout, after which the compilation process is killed and replaced ([0028](../decisions/0028-kotlin-compilation-workers.md)); heap capped per process; body limited to 256 KiB; `429` with `Retry-After` |
| Code designed to exploit the compiler | Execution in the container | Non-root container, read-only file system (except a bounded `tmpfs`), `cap_drop: ALL`, `no-new-privileges`, CPU and memory capped |
| Exfiltration or pivoting from the container | The VPS serves as an attack relay | **No outbound network**: Docker `internal` network (Compose profile `kotlin`), which only the app server (`web`) joins |
| Code execution at compile time (plugins, annotation processors) | Arbitrary execution | The service passes all compiler arguments itself: no plugin, no argument from the request, libraries frozen in the image ([0019](../decisions/0019-kotlin-runtime.md)). No endpoint runs the compiled code |
| Source leak in the logs | Private code exposed | Logs without request body: size, duration, status, hash |
| Abuse of a publicly exposed service by third parties | Cost for the instance | The service is only reachable by the app, on the internal network; the relay rejects an `Origin` from another site, and rate limiting applies to non-browser clients |

### 3.4 Sharing by URL and gist

| Threat | Impact | Mitigation |
|---|---|---|
| Booby-trapped link with malicious code | Unwanted execution | A project opened from a link or a gist is **never run automatically**: "code from a link" banner, explicit "Run" button |
| Decompression bomb in the fragment | Frozen tab | Max fragment size and max decompressed size (project limits of [runtimes.md](./runtimes.md) §8), streaming decompression stopped when exceeded |
| Content that breaks the limits or the schema | Crash, inconsistent state | Effect Schema validation before any write to IndexedDB |
| Link that poses as an official template | Abused trust | A shared project is shown as such, never with the badge of the original template |

The fragment (`#…`) is never sent to the server: the instance does not see the shared code.

### 3.5 GitHub OAuth

| Threat | Impact | Mitigation |
|---|---|---|
| Excessive scopes | Token too powerful if leaked | Scopes requested when needed: `gist` to share, `public_repo` to export; never `repo` nor organization access |
| CSRF on the callback | Binding to the attacker's account | Random `state` parameter, checked at the callback; PKCE if GitHub supports it for the chosen app type |
| Abuse of `POST /api/github/token` | Endpoint used by third parties | Check of the `Origin` header; CORS limited to the app origin; rate limiting |
| Token stored on the server side | Mass leak | The endpoint exchanges `code` → token and returns it; no storage, no log of the token or the `code` |
| Token theft on the client side | Account access | Memory + `sessionStorage` (gone when the tab closes), never `localStorage`; strict CSP on the app origin; revocation link in the UI |

Settled in slice 6 of M5 ([0034](../decisions/0034-github-oauth-and-gists.md)): OAuth App, `state` and PKCE, exchange
on the app server, push limited to public repositories. A GitHub App would have finer permissions, but creating a
repository there requires installing the app with repository administration.

### 3.6 Embed

| Threat | Impact | Mitigation |
|---|---|---|
| Clickjacking on the app | Unintended action (publication, gist) | `frame-ancestors 'none'` on every route except `/embed/*` |
| Clickjacking on the embed | Unintended action in the embed | The embed has no sensitive action: no GitHub sign-in, no gist, no export; "Open in Typika" opens a new tab |
| The host site drives the embed through `postMessage` | State injection | Host API limited to display options (theme, file, tour step), validated by schema; no read of the user's state |
| The embed reads the user's state | Project leak | In a third-party context, storage is partitioned by the browser; the embed only uses the requested public template |

An iframe in a non-isolated third-party page cannot be isolated ([0016](../decisions/0016-isolation-and-embed.md)).
The embed runs `browser-js`, `go` and `kotlin` ([0031](../decisions/0031-embed-runtimes.md)), which do not use
`SharedArrayBuffer`; a runtime that needs it would not start there, and the embed would show "Open in Typika".
The embed requires a secure context: under a host page over `http`, no runtime starts and the embed shows the same
fallback. The Kotlin compilations of an embed go through the app relay, with the same per-IP limit.

## 4. Headers

| Header | App origin | App origin `/embed/*` | Runtime origin |
|---|---|---|---|
| `Content-Security-Policy` | strict (below) | strict + `frame-ancestors *` | permissive for scripts, `connect-src` closed (below) |
| `Cross-Origin-Opener-Policy` | `same-origin` on the isolated routes ([architecture.md](./architecture.md) §5) | — (no effect in an iframe) | `same-origin` |
| `Cross-Origin-Embedder-Policy` | `require-corp` on the isolated routes and on all scripts (`.js`) | — (no isolation possible in a third-party page) | `require-corp`, including worker scripts and `.wasm` |
| `Cross-Origin-Resource-Policy` | `same-origin` | `same-origin` | `cross-origin` (loaded in an iframe by the app) |
| `X-Content-Type-Options` | `nosniff` | `nosniff` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` | `no-referrer` |
| `Strict-Transport-Security` | `max-age=31536000` | same | same |

COEP is `require-corp`, not `credentialless`: WebKit ignores `credentialless` and then never isolates the page
([0016](../decisions/0016-isolation-and-embed.md)). Without CORP `cross-origin` on the runtime origin, the runtime
frame is blocked by the app COEP; without `allow="cross-origin-isolated"` on the iframe, Chromium does not isolate it.
An isolated page only starts a worker if the worker script itself responds with COEP: the app therefore sets
`require-corp` on all its scripts, which changes nothing for a script loaded by a page. This is the case of the worker
of the editor's TypeScript language service.

CSP of the app origin (target; in M1, `connect-src` is `'self'` and `script-src` adds the hashes of the inline scripts
of the SPA shell, computed when the server starts — the other sources arrive with the features that use them):

```
default-src 'self';
script-src 'self' <TYPIKA_ASSETS_BASE_URL>;
worker-src 'self' blob:;
connect-src 'self' https://api.github.com <TYPIKA_REGISTRY_INDEX_URL> <TYPIKA_ASSETS_BASE_URL>;
frame-src <TYPIKA_RUNTIME_ORIGIN>;
img-src 'self' data: https:;
style-src 'self' 'unsafe-inline';
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

No `'wasm-unsafe-eval'`: the TypeScript language service and the Lezer parser are in JavaScript
([0015](../decisions/0015-editor.md)). WASM only runs on the runtime origin.

CSP of the runtime origin:

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob: <TYPIKA_ASSETS_BASE_URL> <CDN ESM>;
worker-src 'self' blob:;
connect-src 'self' <TYPIKA_ASSETS_BASE_URL> <CDN ESM>;
frame-src 'self' blob:;
object-src 'none';
base-uri 'none';
frame-ancestors *;
```

`<CDN ESM>` is the origin of `TYPIKA_PACKAGE_URL_TEMPLATE`; jsDelivr by default, the same as the assets.
`'unsafe-eval'` also serves the `browser-js` harness, which imports the bundle through a dynamically built `import()`.

`frame-ancestors *` is required because the directive checks the **whole** chain of ancestors: in an embed, the host
site page is an ancestor of the runtime frame. The protection of the frame therefore rests on the origin check of the
channel (§2.2), not on `frame-ancestors`.

## 5. Typika's supply chain

- Lockfile required, `pnpm install --frozen-lockfile` in CI.
- Seven-day delay before adopting a new version. pnpm refuses to resolve a more recent version
  (`minimumReleaseAge` in `pnpm-workspace.yaml`), and Renovate waits the same delay before opening its PR
  (`renovate.json`). Renovate also pins Docker images and GitHub actions by digest. Upgrades of Go, Kotlin, Gradle and
  the JDK wait for approval in its dashboard: they touch several files at once, and the Kotlin one makes the registry
  artifacts recompile.
- Runtime assets (esbuild WASM, Go toolchain, test runner): built with the app and served by the instance, under a URL
  that changes with their content. None comes from a third-party CDN. The loader checks the SHA-256 of each Go asset
  before caching it ([0027](../decisions/0027-go-assets-delivery.md)), and the `browser-js` runtime accepts an SRI hash
  for the esbuild WASM: an instance that would serve them from a CDN provides it.
- npm packages (`cli`, `test-runner`) published from CI with provenance.
- Docker image built in CI from the repository, with base images pinned by digest.

## 6. Reporting

The [`SECURITY.md`](../../SECURITY.md) at the root explains how to report a vulnerability privately (GitHub private
vulnerability reporting, enabled on the repository), the supported versions and the scope.
