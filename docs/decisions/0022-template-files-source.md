# 0022 — Template files: jsDelivr at the pinned ref

**Status**: Accepted · 2026-10-12 · slice 2 of M3

## Context

At M3, the app must no longer bundle the templates ([registry §3](../specs/registry.md)). It reads the index, then
loads a template's files from the pinned ref of its entry, in the browser, under COEP `require-corp`. We need a source
that lists the files of a folder at a commit and serves each file with CORS or
`Cross-Origin-Resource-Policy: cross-origin`.

## Decision

**jsDelivr** (`cdn.jsdelivr.net/gh/…` for the files, `data.jsdelivr.com/v1/packages/gh/…?structure=flat` for the
listing):

- Files are served at a commit SHA, shortened to 12 characters like our refs, with `Access-Control-Allow-Origin: *`
  and `Cross-Origin-Resource-Policy: cross-origin`, without quota (checked on 2026-10-12).
- The content at a SHA does not change: the CDN cache and the browser cache are safe.
- The app knows only two URL templates, `TYPIKA_TEMPLATE_FILE_URL_TEMPLATE` and
  `TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE` (`{owner}`, `{repo}`, `{ref}`, `{path}`), on the model of
  `TYPIKA_PACKAGE_URL_TEMPLATE`. A self-hosted instance serves a mirror in the same format.
- `registry-tools mirror <index.json> --out <dir>` writes this mirror: the files of each entry at its ref, and the
  listing of each repository at each commit, in jsDelivr's format.

Until slice 7 of M3, `typika/templates` does not exist: the app build writes the index and the mirror to
`dist/client/registry/`, and the default values point to them. At slice 7, they switch to jsDelivr and the official
registry.

## Consequences

- The build reads the monorepo's Git history for the mirror: `.git` enters the Docker context, and the `build` stage
  installs `git`. The final image contains none of it.
- Opening a template costs one listing request and one request per file, in parallel. The listing covers the whole
  repository at the commit; the app keeps only the template's folder.
- In development and in unit tests, the `bundled` adapter reads `templates/` directly. It is imported dynamically under
  `import.meta.env.DEV`, so it is absent from the production bundle.

## Rejected alternatives

- **GitHub API** (`contents`, `git/trees`): 60 requests per hour and per IP without authentication, already exhausted
  from a development machine during the slice.
- **`raw.githubusercontent.com`**: no file listing, and no `Cross-Origin-Resource-Policy`, so refused under COEP
  `require-corp` without CORS.
- **Template archive in the index**: the index must stay under 500 KB compressed and contain only the hub's metadata.
