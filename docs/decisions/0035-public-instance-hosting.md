# 0035 — Public instance: Docker behind Caddy on a VPS

**Status**: Accepted · 2026-11-22 · slice 4 of M7 · complements [hosting §4](../guides/hosting.md)

## Context

The [hosting guide](../guides/hosting.md) describes two targets for the public instance: Docker behind Caddy, the main
target, and Vercel with the Kotlin service hosted separately. Slice 4 of M7 asks to pick one.

The files of the first have existed since M1 (`Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`), and the
`kotlin` Compose profile since slice 3 of M6. CI builds the image and runs the production E2E tests on it. For Vercel,
nothing is written: the per-host and per-path headers, the `/api/kotlin` relay and its rate limit, which the app's Node
server carries today ([0029](0029-kotlin-relay-rate-limit.md)), would have to be rewritten as Vercel configuration and
functions, and the Kotlin service would need a separate machine anyway.

## Decision

- The public instance runs on **a VPS**, with `docker compose --profile kotlin`: Caddy, `web` and `kotlin-compiler`
  on the same machine. The choice is the maintainer's (2026-11-22).
- The image is **built on the machine**, from a full clone of the repository (`docker compose up -d --build`). An app
  update or a registry publication is deployed with `git pull` followed by the same command.
- Caddy also publishes `443/udp`: it announces HTTP/3 in `Alt-Svc`, and without this port the announcement leads
  nowhere.
- The two domains are two different sites ([security §2.1](../specs/security.md)). They will be chosen with the domain
  name of #92.
- The [hosting §9](../guides/hosting.md) checklist is rehearsed on a local instance of the same stack, over HTTPS,
  with Caddy's internal authority and two `.localhost` names ([hosting §4.6](../guides/hosting.md)).

## Consequences

- A single target is maintained and tested. [hosting §5](../guides/hosting.md) remains an idea for anyone who would
  like to host their own instance on Vercel, with nothing delivered.
- The repository stays public: the machine clones without credentials.
- The prerendered hub follows the registry at the pace of rebuilds. As long as nobody rebuilds, the home page and the
  list show the build's index ([0023](0023-hub-prerendering.md)). Automatic triggering after a registry publication
  waits for slice 5, when the registry repository exists.
- The build shares the machine with the Kotlin service, capped at 2 CPUs and 1 GiB. Measured on 2026-11-22 in a
  builder limited to 2 CPUs, without swap, on arm64: the `web` image needs about 2 GiB of RAM (it builds under 3 GiB
  in 2 min 20, and is killed under 2 GiB), the `kotlin-compiler` image about 1.5 GiB (it builds under 2 GiB in 40 s,
  and is killed under 1 GiB). A machine with **4 GiB and swap** is therefore the minimum to build while the stack
  runs, which takes about 525 MiB at rest; 2 GiB is not enough. The durations on an x86 VPS and the stack's memory
  under load are still to be measured at slice 5, on the real machine.
- No tooled rollback: going back to a version means `git checkout <commit>` then rebuilding.

## Rejected alternatives

- **Vercel and the Kotlin service separately**: two deployments to connect, a relay and headers to rewrite and test a
  second time, for an app whose server already does this work behind any proxy.
- **Pulling the image from a container registry** (GHCR), built by CI: the machine would no longer build, and rollback
  would be a tag change. This publishes one more artifact, to sign and keep in step with the template registry, whose
  index is frozen in the image. To reconsider if building on site hinders the service, or for a machine with less than
  4 GiB: it would only have the stack to run.
- **An IP as the second site for the local rehearsal** (`127.0.0.1`, as in the HTTP trials): over HTTPS a client does
  not send SNI for an IP, and Caddy, which sees the container's address, does not find the certificate.
