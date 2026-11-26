# Hosting Typika

Status: guide · in line with the repository files (`Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`,
`.env.example`) since M1, and with the `kotlin` Compose profile since slice 3 of M6. The public instance follows §4
([0035](../decisions/0035-public-instance-hosting.md)); Vercel (§5) is still to do.

Context: [architecture.md](../specs/architecture.md) for the components, [security.md](../specs/security.md) for the
headers and isolation.

## 1. What to host

| Component | Required | Role |
|---|---|---|
| `web` | yes | Static (prerendered hub, sandbox SPA, runtime frame) + `POST /api/github/token` |
| Two origins | yes | App and runtime. Public instance: two **different sites**; private instance: a subdomain is enough ([security.md](../specs/security.md) §2.1) |
| `kotlin-compiler` | no | Kotlin compilation; without it, Kotlin templates are hidden |
| GitHub OAuth application | no | Without it, gist sharing and GitHub export are disabled |
| Asset CDN | no | Heavy assets (WASM); a public CDN by default, self-hostable |

**Pure static mode**: without the endpoint or the Kotlin service, the app stays usable (hub, TS / JS / Go sandbox,
sharing by URL, zip export). Any platform that serves static files with custom headers is enough.

## 2. Environment variables

Read **when the container starts**, not at build time: one image serves several instances. The server exposes the
public values to the client through `/config.json`.

| Variable | Required | Public | Example | Role |
|---|---|---|---|---|
| `TYPIKA_PUBLIC_URL` | yes | yes | `https://typika.example.org` | App origin |
| `TYPIKA_RUNTIME_ORIGIN` | yes | yes | `https://typika-run.example.net` | Origin of the runtime frame, a different site from the app |
| `TYPIKA_REGISTRY_INDEX_URL` | no | yes | `https://…/index.json` | Registry index; default: `/registry/index.json`, served by the app until slice 7 of M3. The Kotlin artifacts are read next to it, in `artifacts/kotlin/` |
| `TYPIKA_TEMPLATE_FILE_URL_TEMPLATE` | no | yes | `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}` | File of a template at its pinned ref ([0022](../decisions/0022-template-files-source.md)); default: the app's mirror |
| `TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE` | no | yes | `https://data.jsdelivr.com/v1/packages/gh/{owner}/{repo}@{ref}?structure=flat` | List of the files of a repository at a commit, in jsDelivr's format; default: the app's mirror |
| `TYPIKA_ASSETS_BASE_URL` | no | yes | `https://cdn.jsdelivr.net/npm/@typika/runtime-assets@1.0.0/` | Base of the runtime assets. Not read yet: the image serves its own assets ([0027](../decisions/0027-go-assets-delivery.md)) |
| `TYPIKA_PACKAGE_URL_TEMPLATE` | no | yes | `https://esm.sh/{name}@{version}{path}` | ESM CDN for the npm dependencies of `browser-js` templates; default: jsDelivr ([runtimes](../specs/runtimes.md) §6.1) |
| `TYPIKA_EMBED_ENABLED` | no | yes | `true` | Enables `/embed/*` |
| `KOTLIN_COMPILER_URL` | no | no | `http://kotlin-compiler:8080` | Internal address of the compilation service, which the app relays under `/api/kotlin` ([0029](../decisions/0029-kotlin-relay-rate-limit.md)); absent ⇒ Kotlin disabled |
| `TYPIKA_KOTLIN_RATE_PER_MINUTE` | no | no | `20` | Compilations per minute and per IP; beyond that, `429` |
| `TYPIKA_KOTLIN_RATE_BURST` | no | no | `10` | Compilations in advance that an IP can chain |
| `TYPIKA_TRUST_PROXY` | no | no | `true` | The client IP is the last `X-Forwarded-For`; only behind a proxy that rewrites this header (Caddy). `docker-compose.yml` sets it to `true` |
| `GITHUB_CLIENT_ID` | no | yes | `Ov23li…` | OAuth application; absent ⇒ GitHub features disabled |
| `GITHUB_CLIENT_SECRET` | if `GITHUB_CLIENT_ID` | **no** | — | `code` → token exchange, never exposed to the client |
| `TYPIKA_GITHUB_URL` | no | yes | `https://github.example.com` | Replaces `https://github.com`: GitHub Enterprise, or the E2E fake GitHub ([0034](../decisions/0034-github-oauth-and-gists.md)) |
| `TYPIKA_GITHUB_RATE_PER_MINUTE` | no | no | `10` | `code` → token exchanges per minute and per IP; beyond that, `429` |
| `TYPIKA_GITHUB_RATE_BURST` | no | no | `5` | Exchanges in advance that an IP can chain |
| `TYPIKA_GITHUB_API_URL` | no | yes | `https://github.example.com/api/v3` | Replaces `https://api.github.com`; its origin goes into `connect-src` |
| `PORT` | no | no | `3000` | Listening port of the `web` service |
| `NODE_ENV` | no | no | `production` | — |

Variables of the `kotlin-compiler` service:

| Variable | Default | Role |
|---|---|---|
| `KOTLIN_COMPILER_ALLOWED_ORIGIN` | — | Origin allowed in CORS (the app); unneeded if the service is behind the same domain |
| `KOTLIN_COMPILER_MAX_BODY_KB` | `256` | Max size of the sources |
| `KOTLIN_COMPILER_TIMEOUT_MS` | `15000` | Compilation timeout; beyond it, the compilation process is killed and the response is `504` |
| `KOTLIN_COMPILER_CONCURRENCY` | `2` | Compilation processes, hence simultaneous compilations; the next ones wait |
| `KOTLIN_COMPILER_QUEUE_MAX` | `20` | Waiting compilations; beyond that, response `503` |
| `KOTLIN_COMPILER_CACHE_MB` | `32` | In-memory cache of the artifacts (`0` to disable) |
| `KOTLIN_COMPILER_WORKER_JAVA_OPTS` | see [0028](../decisions/0028-kotlin-compilation-workers.md) | JVM options of the compilation processes |

With Compose, these variables are set in `.env`, from which `docker-compose.yml` takes `CONCURRENCY`, `QUEUE_MAX`,
`TIMEOUT_MS` and `CACHE_MB`; the service does not read the rest of `.env`, which may contain secrets of `web`.
`KOTLIN_COMPILER_MEMORY` (`1g`) and `KOTLIN_COMPILER_CPUS` (`2`) cap the container: raise them along with the
concurrency.

A full queue and a crashed compilation process both respond `503` with `Retry-After: 5`, which the relay passes on.
The relay itself responds `503` with `Retry-After: 5` when the service is unreachable or does not respond within
25 s.

Values in line with [runtimes.md](../specs/runtimes.md) §8. Sizing measured in slice 1 of M6
([0028](../decisions/0028-kotlin-compilation-workers.md)): with 2 vCPU and 1 GiB, 2 compilation processes sustain
2.4 compilations per second of `strategy-kotlin`, with a peak at 815 MiB. Each additional process costs about
380 MiB.

Outside Compose, the image runs like this, with the protections of [security §3.3](../specs/security.md):

```sh
docker build -t typika-kotlin-compiler services/kotlin-compiler
docker run --read-only --tmpfs /tmp:size=64m --cap-drop ALL --security-opt no-new-privileges \
  --memory 1g --cpus 2 -p 127.0.0.1:8080:8080 typika-kotlin-compiler
```

## 3. Build

```sh
pnpm install --frozen-lockfile
pnpm --filter @typika/web build
```

The build produces `apps/web/dist/`: `client/` (assets, SPA shell `_shell.html` and prerendered hub pages), `runtime/`
(runtime frame), `server/` (TanStack Start handler for the server routes) and `node/main.js`, the production server.
Both server bundles embed their dependencies: `dist/` is enough to run the app with `node dist/node/main.js`, without
`node_modules`.

The build also writes the registry index (Vite plugin `registry-index`) and the mirror of the templates at their pinned
ref (`pnpm --filter @typika/web build:registry`) into `dist/client/registry/`. Both read the Git history: the build
needs a full clone and `git`. The
files under `/registry/gh/` and `/registry/listing/` are served as immutable, the index as `no-cache`. If the three
registry URLs point to another origin, it must respond with CORS or `Cross-Origin-Resource-Policy:
cross-origin`, and the app's CSP adds it to `connect-src`.

The hub prerendering reads the registry index **at build time**. For the hub pages to follow the registry:

- Rebuild the image on each publication of the index (registry webhook or scheduled build).
- In the meantime, the home page and the list show the index of the build. The page of a template absent from the
  build is served by the shell, and the client renders it from `TYPIKA_REGISTRY_INDEX_URL`
  ([0023](../decisions/0023-hub-prerendering.md)).

The server serves `<path>/index.html` when the build prerendered it, with a CSP that allows the inline scripts of
that page, and the shell otherwise.

## 4. Docker (main target)

### 4.1 The `web` server sets the headers

The production server (`apps/web/server/`) serves both origins from a single port and picks one based on the `Host`
header:

- **runtime host** (the one of `TYPIKA_RUNTIME_ORIGIN`): only `/runtime/*` (runtime frame, assets,
  `/runtime/config.json`). Any other URL responds `404`: no app page is served on the runtime origin.
- **any other host**: the app. `/config.json` and `/api/*` go to the TanStack Start handler, the files of
  `dist/client/` are served as is, the other paths receive the SPA shell. `/runtime/*` responds `404`.

It sets COOP, COEP, CORP, CSP, `Referrer-Policy` and `X-Content-Type-Options` itself, based on the host and the path
([security.md](../specs/security.md) §4). The inline scripts of the shell are allowed by their hash, computed at
startup. All the app's scripts carry `Cross-Origin-Embedder-Policy: require-corp`, otherwise an isolated page
refuses to start a worker from them (the one of the editor's language service). The image is therefore correct behind
any reverse proxy; the proxy only adds TLS, HSTS and
compression. Hashed assets (`/assets/*`, `/runtime/assets/*`) are served with
`Cache-Control: public, max-age=31536000, immutable`, the rest with `no-cache`.

### 4.2 Dockerfile

Multi-stage, base image `node:24-slim` pinned by digest:

1. **`build`**: installs `git` (the template mirror reads the history, hence `.git` in the context), enables pnpm
   through Corepack, `pnpm fetch` on the lockfile (layer cached as long as the lockfile does not
   change), copies the sources, `pnpm install --offline --frozen-lockfile`, `pnpm --filter @typika/web build`.
2. **`runtime`**: copies only `apps/web/dist/`, user `node` (uid 1000), `EXPOSE 3000`, `HEALTHCHECK` on
   `GET /`. About 370 MB, most of it the Node image.

The container reads and writes nothing but `dist/`: it runs with `read_only: true` and without capabilities.

### 4.3 docker-compose.yml and Caddyfile

`docker-compose.yml` runs `web` (built from the `Dockerfile`) behind Caddy, which waits for `web` to be
`healthy`. `deploy/Caddyfile` declares the two domains (`TYPIKA_APP_DOMAIN`, `TYPIKA_RUNTIME_DOMAIN`), obtains the
certificates, adds HSTS, compresses, removes the `Server` header and forwards everything to `web:3000`, keeping `Host`.
Compose publishes ports 80 and 443, the latter over TCP and UDP for HTTP/3.

The Kotlin service is in the `kotlin` Compose profile. It is attached only to the `kotlin` network, declared
`internal`: no outbound access, and only `web`, attached to both networks, reaches it. Caddy does not see it. `web`
relays it under `/api/kotlin` and rate limits by IP ([0029](../decisions/0029-kotlin-relay-rate-limit.md)); Compose sets
`TYPIKA_TRUST_PROXY=true`, since Caddy replaces the received `X-Forwarded-For` with the address it sees. The service
container takes over the protections of [security §3.3](../specs/security.md): read-only FS, 64 MiB `tmpfs`
on `/tmp`, no capabilities, 1 GiB without swap, 2 CPUs, 256 processes.

### 4.4 Starting

```sh
cp .env.example .env            # fill in the variables of §2 and the two domains
docker compose up -d --build
```

With Kotlin, uncomment `KOTLIN_COMPILER_URL=http://kotlin-compiler:8080` in `.env`, then:

```sh
docker compose --profile kotlin up -d --build
```

Without the profile, leave `KOTLIN_COMPILER_URL` commented out: otherwise the app offers Kotlin and every compilation
responds `503`.

### 4.5 Load test of the Kotlin service

`services/kotlin-compiler/scripts/load-test.ts` measures the service through Caddy and the relay, on the Compose stack
started with the `kotlin` profile. Two scenarios:

```sh
# default limits: a burst from a single client receives 429s with Retry-After
pnpm --filter @typika/kotlin-compiler load-test --app http://localhost --scenario rate --requests 30
# restart web with TYPIKA_KOTLIN_RATE_BURST=1000: 60 simultaneous compilations and two trapped compilations
pnpm --filter @typika/kotlin-compiler load-test --app http://localhost --scenario saturate --requests 60
```

The second scenario fails if a compilation responds anything other than `200` or `503`, if the full queue does not
respond `503` with `Retry-After`, if the trapped compilations do not receive `504`, if the container exceeds its memory
limit, is killed for memory or restarts, or if the service no longer compiles after the load. For a local trial,
`TYPIKA_APP_DOMAIN=http://localhost` and `TYPIKA_RUNTIME_DOMAIN=http://127.0.0.1` make Caddy serve over HTTP.

Local trial without Caddy, two sites on the same port:

```sh
docker build -t typika-web .
docker run --rm -p 3200:3000 --read-only --cap-drop ALL \
  -e TYPIKA_PUBLIC_URL=http://localhost:3200 -e TYPIKA_RUNTIME_ORIGIN=http://127.0.0.1:3200 typika-web
```

`localhost` and `127.0.0.1` are different sites and secure contexts: the runtime frame is isolated there as in
production.

### 4.6 On a VPS, and the local rehearsal

The public instance runs this way ([0035](../decisions/0035-public-instance-hosting.md)). On the machine:

- Docker with Compose, and a **full clone** of the repository: the build reads the Git history (§3).
- At least **4 GiB of memory, with swap**: building the `web` image takes about 2 GiB and the `kotlin-compiler` one
  about 1.5 GiB, while the stack keeps running. Below 2 GiB, the `web` build
  is killed for lack of memory ([0035](../decisions/0035-public-instance-hosting.md)).
- Both domains point to the machine (`A`, and `AAAA` if it has an IPv6) before the first start: Caddy
  requests the certificates as soon as it starts.
- The firewall lets in 80/tcp, 443/tcp and 443/udp, and nothing else but SSH.
- `.env` from `.env.example`, readable only by the account that runs Compose: it holds `GITHUB_CLIENT_SECRET`.

An update of the app, or a registry publication to show in the hub:

```sh
git pull --ff-only
docker compose --profile kotlin up -d --build
```

The stack can be rehearsed locally, over HTTPS, without a domain or a VPS. Caddy signs `.localhost` names with its
internal authority, and `localhost` and `typika-run.localhost` are two different sites. In `.env`:

```sh
TYPIKA_PUBLIC_URL=https://localhost
TYPIKA_RUNTIME_ORIGIN=https://typika-run.localhost
TYPIKA_APP_DOMAIN=localhost
TYPIKA_RUNTIME_DOMAIN=typika-run.localhost
TYPIKA_EMBED_ENABLED=true
```

```sh
docker compose up -d --build
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt
curl -I --cacert /tmp/caddy-root.crt https://localhost/play/strategy-ts
```

The load test (§4.5) reads this authority with `NODE_EXTRA_CA_CERTS=/tmp/caddy-root.crt` and
`--app https://localhost`. The production E2E suite (§9) does not know it: `TYPIKA_E2E_IGNORE_HTTPS_ERRORS=1` makes
it accept the certificate. An IP does not work as the second site over HTTPS: without SNI, Caddy does not find its
certificate.

### 4.7 Behind a platform's proxy (Coolify)

On a machine where a proxy already holds ports 80 and 443, `docker-compose.coolify.yml` runs `web` and
`kotlin-compiler` without Caddy and without publishing a port: the platform terminates TLS and routes both domains to
port 3000 of `web`. Written for Coolify ("Docker Compose" resource pointed at this file), it suits any proxy
that joins the project's network.

- Both domains are attached to the `web` service, port 3000. `kotlin-compiler` gets none.
- `TYPIKA_PUBLIC_URL` and `TYPIKA_RUNTIME_ORIGIN` are required; `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
  are set in the same place. Kotlin is always enabled.
- The machine builds nothing: it pulls `ghcr.io/typika-app/typika-web` and
  `ghcr.io/typika-app/typika-kotlin-compiler`, which the `images` workflow publishes for amd64 and arm64 on each commit
  to `main`, under `latest` and under the commit SHA. Both services have `pull_policy: always`: each redeployment pulls
  `latest` again, otherwise the platform restarts the image already present. `TYPIKA_IMAGE_TAG` pins a SHA. Building
  both images at once takes about 3.5 GiB (§4.6), which a shared 4 GiB machine does not have.
- The images are not signed.
- `Strict-Transport-Security`, which the Caddyfile sets here, falls to the platform's proxy.
- To check after the first deployment: that the platform has not attached `kotlin-compiler` to a network with outbound
  access (`docker inspect`), and that the proxy does replace the received `X-Forwarded-For`, otherwise the per-IP rate
  limit can be bypassed.

## 5. Vercel

- Vercel project on `apps/web`, two domains attached: the app's and the runtime's.
- The headers must be declared in `vercel.ts` with per-host rules (`has: [{ type: 'host', value: … }]`)
  and per-path rules, with the same values as the `web` server (§4.1, `apps/web/server/security-headers.ts`). Not done
  in M1; the exact syntax is to be checked against `@vercel/config`.
- `POST /api/github/token` runs as a Vercel function (Node runtime by default).
- **The Kotlin service does not run on Vercel**: it is a JVM container with a queue and network limits. Deploy it on a
  VPS or a managed container service. The `/api/kotlin` relay and its rate limiting live in the app's Node server
  ([0029](../decisions/0029-kotlin-relay-rate-limit.md)): to be ported to a Vercel function, to be done with the rest
  of this §5.
- Env variables through `vercel env`; `GITHUB_CLIENT_SECRET` only in the server environment.

## 6. Other platforms

Requirements for any platform:

1. Serve static files with **different headers per host and per path** (COOP, COEP, CORP, CSP).
2. Attach two domains on different sites.
3. Optional: run a function for `POST /api/github/token`.

| Platform | Headers | Endpoint | Note |
|---|---|---|---|
| Cloudflare Pages | `_headers` file | Pages Functions | To test: per-host header rules |
| Netlify | `_headers` file or `netlify.toml` | Netlify Functions | Same |
| Simple static hosting (S3 + CDN, GitHub Pages) | depends on the CDN | no | Pure static mode; GitHub Pages does not allow custom headers, so it is **not suitable** |

## 7. Heavy assets

The runtime assets (esbuild WASM, Go toolchain) are in the image and served by the runtime domain
([0027](../decisions/0027-go-assets-delivery.md)).

- **Build**: the build stage of the `Dockerfile` copies Go 1.24.5 from the `golang` image pinned by digest and
  rebuilds the Go assets (`pnpm --filter @typika/runtime-go build:assets`, about 100 s). Outside Docker, the Go
  installed on the machine must be exactly the pinned version.
- **Serving**: `/runtime/assets/go/<key>/` with `Cache-Control: public, max-age=31536000, immutable`. Each file
  has its `.br` version, served with `Content-Encoding: br` when the browser accepts it (11.9 MB instead of 79 MB). A
  proxy placed in front must not recompress a response that already has a `Content-Encoding`; Caddy does not.
- **Cache**: the browser keeps the Go assets in Cache Storage on the runtime domain; a reload does not download them
  again.
- The version of the assets is fixed by the version of the app: do not mix them.

## 8. GitHub OAuth

1. Create an OAuth App ([0034](../decisions/0034-github-oauth-and-gists.md)): *Settings → Developer settings → OAuth
   Apps* of the account or the organization.
2. Callback URL: `<TYPIKA_PUBLIC_URL>/auth/github/callback`.
3. Fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. The `POST /api/github/token` exchange is rate limited per IP
   (`TYPIKA_GITHUB_RATE_*`), and rejects an `Origin` other than the app.

In development, the callback is `http://localhost:3000/auth/github/callback`, and both variables go in
`apps/web/.env.local`, which `pnpm --filter @typika/web dev` reads at startup. This file is ignored by git, and a
variable already defined in the shell takes precedence over it.

## 9. Post-deployment checklist

- [ ] Both domains respond over HTTPS, with valid certificates.
- [ ] Public instance: the runtime domain is a **different site** from the app (not a subdomain).
- [ ] `curl -I <app>/play/strategy-ts` shows `Cross-Origin-Opener-Policy: same-origin` and
      `Cross-Origin-Embedder-Policy: require-corp`.
- [ ] In the sandbox, a type error typed in the editor is underlined: the language service worker starts.
- [ ] `curl -I <app>/` shows `frame-ancestors 'none'`; `curl -I <app>/embed/<template>` shows `frame-ancestors *`,
      without COOP or COEP.
- [ ] In the sandbox, the runtime frame console returns `self.crossOriginIsolated === true`.
- [ ] An app page requested on the runtime domain is not served.
- [ ] A TS template opens, its tests pass.
- [ ] `/play/strategy-go` downloads the Go toolchain in brotli (`Content-Encoding: br` on `compile.wasm`), its tests
      pass, and a reload does not download it again.
- [ ] `/config.json` contains no secret.
- [ ] With Kotlin: a Kotlin template compiles; the `rate` scenario of the load test (§4.5) passes; an outbound
      connection from the `kotlin-compiler` container fails.
- [ ] Without Kotlin: no Kotlin template appears in the hub.
- [ ] With GitHub: sign-in, gist creation, then sign-out that clears `sessionStorage`.
- [ ] The production E2E suite passes against the instance, started without Kotlin, since its hub tests expect an
      instance that does not compile:
      `TYPIKA_E2E_APP_URL=<app> TYPIKA_E2E_RUNTIME_URL=<runtime> pnpm --filter @typika/web test:e2e:production headers sandbox hub compare embed`.
      `registry` and `health` need the test registry of the local build, and `github` its fake GitHub.
