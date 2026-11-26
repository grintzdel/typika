# Decisions (ADR)

One structural decision = one `NNNN-slug.md` file: context, decision, consequences, rejected alternatives.
A decision is never rewritten: we create a new one that supersedes it, and set the old one to
"Superseded by NNNN".

Statuses: `Proposed` (waiting for a spike), `Accepted`, `Superseded by NNNN`.

| # | Decision | Status |
|---|---|---|
| [0001](0001-browser-first.md) | Execution in the browser | Accepted |
| [0002](0002-kotlin-compilation-service.md) | Kotlin through a compilation service | Superseded by 0019 |
| [0003](0003-static-templates.md) | Static templates in V1 | Accepted |
| [0004](0004-git-registry-static-index.md) | Git registry and static index | Accepted |
| [0005](0005-client-side-search.md) | Client-side search and filters | Accepted |
| [0006](0006-effect-atom-instead-of-redux.md) | Effect Atom rather than Redux | Accepted |
| [0007](0007-no-business-backend.md) | No business backend | Accepted |
| [0008](0008-codemirror-6.md) | CodeMirror 6 as the editor | Superseded by 0015 |
| [0009](0009-typescript-reference-language.md) | TypeScript as the reference language, selective coverage | Accepted |
| [0010](0010-english-template-content.md) | Template content in English, bilingual interface | Accepted |
| [0011](0011-licenses.md) | Licenses | Accepted |
| [0012](0012-language-scope.md) | Languages: TS, JS, Go, Kotlin | Accepted |
| [0013](0013-dedicated-runtime-origin.md) | Dedicated origin for execution | Accepted |
| [0014](0014-name-typika.md) | Name: Typika | Accepted — trademark search at M0 |
| [0015](0015-editor.md) | Editor: CodeMirror 6 and in-house TypeScript adapter | Accepted |
| [0016](0016-isolation-and-embed.md) | Cross-origin isolation and embed | Accepted — Firefox and real Safari to check |
| [0017](0017-node-runtime.md) | No `node` runtime in V1 | Accepted |
| [0018](0018-go-runtime.md) | Go runtime: the Go toolchain compiled to WASM | Accepted — Firefox to check |
| [0019](0019-kotlin-runtime.md) | Kotlin runtime: an in-house compilation service, JS target | Accepted — Firefox to check |
| [0020](0020-tour-markdown.md) | Tour Markdown rendering: react-markdown | Accepted |
| [0021](0021-diff-engine.md) | Diff engine: @codemirror/merge | Accepted |
| [0022](0022-template-files-source.md) | Template files: jsDelivr at the pinned ref | Accepted |
| [0023](0023-hub-prerendering.md) | Hub prerendering from the build's index | Accepted |
| [0024](0024-manifest-keywords.md) | Search keywords in the manifest, without changing the schema | Accepted |
| [0025](0025-health-run.md) | The health run drives the app | Accepted |
| [0027](0027-go-assets-delivery.md) | Go assets: served by the image, kept in Cache Storage | Accepted |
| [0028](0028-kotlin-compilation-workers.md) | Kotlin compilation: processes killed on timeout | Accepted |
| [0029](0029-kotlin-relay-rate-limit.md) | Kotlin compilation: relayed and rate-limited by the app server | Accepted |
| [0030](0030-kotlin-exercise-artifacts.md) | Kotlin exercises: their start state is precompiled | Accepted |
| [0031](0031-embed-runtimes.md) | Runtimes in the embed: all three, in a secure context | Accepted |
| [0032](0032-cli-archives-and-validate.md) | CLI: GitHub archives and `validate --run` in Node | Accepted |
| [0033](0033-github-org-typika-app.md) | GitHub organization: `typika-app` | Accepted |
| [0034](0034-github-oauth-and-gists.md) | GitHub: OAuth App, exchange on the app server, readable gist | Accepted |
| [0035](0035-public-instance-hosting.md) | Public instance: Docker behind Caddy on a VPS | Accepted |
