# 0017 — No `node` runtime in V1

**Status**: Accepted · 2026-10-08 · outcome of spike [R1](../spikes.md)

## Context

The `node` runtime was to rest on WebContainers, for templates that need `npm install`, an HTTP server or a full Vite.
The platform is under MIT ([0011](0011-licenses.md)): anyone can host it, including a company for its teams. Spike R1
read the terms in force on 2026-10-08.

**WebContainers** (`@webcontainer/api` 1.6.4):

- The npm package is under MIT, but it is only a client. Its README states that the API "relies on hosted proxies and
  server-side acceleration from StackBlitz" and that integrating it amounts to accepting StackBlitz's terms of service.
- Terms of service, §1.5(c): usage is subject to the published tiers, session limits and other limits. "Use in a
  production or commercial setting, or beyond the stated limits, requires an active plan or separate written
  license." Access can be revoked.
- "Commercial Usage" page: a license is required as soon as the API serves "your customers, prospective customers,
  and/or employees". Self-hosting only exists in the Enterprise offer.
- The 2023 promise "always free for open source" no longer appears in the current terms.
- The runtime requires `SharedArrayBuffer`: it does not start in an embed ([0016](0016-isolation-and-embed.md)).

**Nodebox** (`@codesandbox/nodebox` 0.1.9):

- Sustainable Use License 1.0, which is not an OSI license: usage "only for your own internal business purposes or for
  non-commercial or personal use", distribution "only if you do so free of charge for non-commercial purposes".
- The runtime depends on CodeSandbox's servers, and the package has not been published since April 2025.

**Actual need**: the 44 templates of the [catalog](../specs/catalogue.md) run on `browser-js`, `go` or `kotlin`,
without any dependency outside the standard library and the test tool. None needs `node`.

## Decision

- **`node` is not part of V1.** Schema 1 of the manifest does not accept it: `runtime.kind` is `browser-js`, `go` or
  `kotlin`.
- **No WebContainers or Nodebox as a platform dependency.** Each would make every instance depend on a third-party
  service. The public instance and third-party instances would be subject to a license we do not control, and that can
  be revoked.
- **TS and JS go through `browser-js`.** The npm dependencies of a third-party template, if any, are resolved through
  an ESM CDN, as planned in [runtimes](../specs/runtimes.md). A package that requires Node APIs is not supported in V1.
- We do not contact StackBlitz. A written agreement would at best cover the public instance, never third-party
  instances, and would remove neither the dependency on their servers nor the impossibility of the embed.

## Consequences

- R1 no longer blocks the freeze of schema 1. Adding `node` later will be a schema change (`runtime.kind` is a closed
  enumeration), with a migration without effect on existing manifests.
- The `runtime-node` package, the xterm.js terminal and the timeout of long processes leave V1.
  `vitest-reporter` now only serves the conformance suite of the `test-runner`: it becomes internal and is no longer
  published on npm.
- Templates that would need an HTTP server or `npm install` wait for the self-hostable runner (V2).
- The `RuntimePort` stays the extension point. An optional WebContainers adapter is conceivable in V2, enabled by the
  operator of an instance under their own license. It would never be active by default.

## Rejected alternatives

- **WebContainers under an agreement with StackBlitz**: does not cover third-party instances, keeps the network
  dependency, cut off from the embed.
- **Nodebox**: non-OSI license, incompatible with an MIT platform that can be hosted commercially, stalled project.
- **In-house Node runtime** (`fs`, `http` polyfills on `browser-js`): high cost for a need that is zero in the
  catalog.
- **Keeping `node` reserved in schema 1**: freezes a contract (shell commands, optional `entry`) that nothing has
  validated.
