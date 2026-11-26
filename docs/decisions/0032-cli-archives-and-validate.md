# 0032 — CLI: GitHub archives and `validate --run` in Node

**Status**: Accepted · 2026-10-20 · slice 5 of M5 · complements [sharing-and-cli §6-7](../specs/sharing-and-cli.md)

## Context

Slice 5 builds `packages/cli`, the `typika` package: `typika create` and `typika validate`. The spec sets the download
of "the archive of the pinned ref from GitHub", and a `validate --run` that runs the templates "in a headless
browser". Three points were still open. First, where the archives come from when the registry is served locally, since
`typika/templates` does not exist yet (#92). Next, what the `--run` browser costs. Finally, which Kotlin compilation
service to use by default.

Checked on 2026-10-20 on a public repository: `codeload.github.com/<owner>/<repo>/tar.gz/<ref>` accepts a 12-character
short SHA, like our refs, and `HEAD`. It responds `404` on a missing ref, and puts everything under a root folder
`<repo>-<ref>/`. It is not the REST API: the limit of 60 requests per hour does not apply.

## Decision

- **One archive per template, with the `{owner}`, `{repo}`, `{ref}` URL template.** The default value is codeload,
  and the `--archive-url` option replaces it, for a self-hosted instance or for tests. The CLI decompresses with
  `node:zlib`, then reads the tar with a custom reader of about sixty lines (ustar, `path` of pax headers, GNU long
  names). It removes the root folder, then keeps the ref's `path` subfolder. An unpinned ref downloads `HEAD`, with a
  warning.
- **Tests go through a local registry**: `serveLocalRegistry` builds the index with `buildLocalIndex`, then serves each
  archive with `git archive <sha>:templates`. It is the same content as the codeload archive, except for the root
  folder.
- **`--keep-tour` keeps all the Typika files**, `exercises/` included, and adds `parent`, like the zip export "with
  the Typika files". Without `exercises/`, the kept `typika.toml` would declare missing exercises. With `--exercise`,
  `exercises/` is always dropped, since the spec removes hints and solution.
- **`validate --run` uses the `template-check` runners, in Node.** There is no browser to download. These are the
  runners that play V9 in the local check and in `registry-tools`. `--run` also checks that the template's tests pass,
  under a new code, `E_TESTS_FAIL`. Booting the entry stays with the health run (V8).
- **No default Kotlin service.** The public instance's relay refuses any request whose `Origin` is not the app
  ([0029](0029-kotlin-relay-rate-limit.md)). Without `--kotlin-compiler <url>`, which designates the compilation
  service itself, `--run` says it did not run the Kotlin template.
- **`validate` does not check the refs.** Variant symmetry and the role of the base depend on the registry. The tour
  order is compared with the TypeScript variant, if the index and its archive are reachable. Otherwise, a note says
  so.
- **Provisional default values**: the default index is `https://typika.dev/registry/index.json`, and the added README
  links to `https://typika.dev/templates/<name>`. The domain is not reserved (#92).

## Consequences

- `typika create strategy-ts`, then the `go` and `kotlin` variants, were run against the local registry on
  2026-10-20. The three projects pass their tests outside Typika: `npm test` (11 tests), `go test ./...` and
  `gradle test`. This native check is done by hand, as in slice 3. The package's E2E compares the created files with
  `git ls-tree` at the pinned ref.
- The package is not published. Its `bin` runs `src/cli.ts` thanks to Node 24's type stripping, and it depends on the
  workspace packages. The Go runner reads the `@typika/runtime-go` assets from disk. To publish (#92), we will need a
  bundle and a download of the Go assets on the first `--run`. We can then go back to Node ≥ 22, as the spec says.
- A `validate` report gives the file or the field, not the line: the manifest codes do not carry one.

## Rejected alternatives

- **The mirror in jsDelivr format ([0022](0022-template-files-source.md))**: it needs a listing request, then one
  request per file. The archive fits in a single request, and the spec plans for it.
- **GitHub's REST API (`/tarball`)**: it is limited to 60 requests per hour without a token.
- **The `tar` npm package**: one more dependency, for a format that about sixty lines are enough to read.
- **Playwright for `--run`**: it downloads about 150 MB of browser, to run the same runners that already run in Node.
