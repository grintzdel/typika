# 0020 — Tour Markdown rendering: react-markdown

**Status**: Accepted · 2026-10-11 · slice 2 of M2

## Context

The body of a tour step is Markdown ([manifest §5.1](../specs/manifest.md)). The Tour panel must display it without
raw HTML, open `typika:<name>` links to the sandbox of a bundled template, and run nothing that comes from a third-party
template at M3. No Markdown library was in the app yet.

## Decision

**`react-markdown` 10**, without plugins:

- Raw HTML is removed (`skipHtml`), and so are images. The tree is rendered as React elements: no
  `dangerouslySetInnerHTML`, no sanitizer to maintain.
- All links go through `resolveTourLink` (`tour` module): `typika:<name>` becomes `/play/<name>` if the template is
  bundled, `http(s)` opens in a new tab without `opener`, everything else (`javascript:`, relative paths, missing
  template) is rendered as text. The library's default `urlTransform` is disabled because it would strip `typika:`
  before this resolution.
- Weight: ~119 KiB minified, ~37 KiB gzip (unified, remark-parse, mdast, hast), in the sandbox chunk.

## Consequences

- Code blocks in the tour are not highlighted. Highlighting them with the editor's highlighter can be done in a `code`
  component without changing libraries.
- If the weight is a burden on mobile, the Tour panel can be loaded on demand: only this module imports
  `react-markdown`.

## Rejected alternatives

- **`micromark` (or `markdown-it`) with HTML disabled**: lighter (~16 KiB gzip), but produces an HTML string to inject
  and links to rewrite afterwards. More code to secure for a modest saving.
- **A custom renderer on `@lezer/markdown`**: already present through `@codemirror/lang-markdown`, so no new
  dependency, but we would have to write and test the whole rendering (lists, links, blocks, emphasis) ourselves.
