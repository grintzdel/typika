# 0021 — Diff engine: @codemirror/merge

**Status**: Accepted · 2026-10-11 · slice 3 of M2

## Context

The Diff tab ([ui §6.4 and §8](../specs/ui.md)) compares the base and the template, or the template and the user's
project, file by file, side by side or in a unified view. The editor is CodeMirror 6 ([0015](0015-editor.md)), which
already provides the highlighting, the theme and the language of each file.

## Decision

**`@codemirror/merge` 6.12**:

- `MergeView` for the side-by-side view, `unifiedMergeView` for the unified view, with unchanged lines folded beyond 3
  lines of context. Both views are read-only.
- It depends only on CodeMirror packages already present: ~28 KiB minified, ~10 KiB gzip extra.
- Additions and deletions carry a `+` / `-` sign in a gutter computed from `getChunks`, and not only a color
  ([ui §15](../specs/ui.md)).
- The "Since the base" diff removes the `// #region tour:` markers on both sides, like the export
  ([manifest §5.2](../specs/manifest.md)); "My changes" shows the files as they are.

## Consequences

- The diff opens in an editor tab, not in the side panel, to get the width of a side-by-side view. The editor stays
  mounted (hidden) meanwhile, to keep the state and history of each file.
- The tour steps anchored in the compared file are listed above the diff, as buttons, rather than placed in a gutter
  the keyboard cannot reach.

## Rejected alternatives

- **`diff` (jsdiff) and an HTML table rendering**: simpler to make accessible, but without highlighting or folding of
  unchanged lines, which we would have to write. We would have two code renderings in the app.
