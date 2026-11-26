# 0008 — CodeMirror 6 as the editor

**Status**: Superseded by [0015](0015-editor.md) · 2026-10-08

## Context

The editor must work in the sandbox and in the embed, including on mobile for reading, with good TypeScript support.

## Decision

**CodeMirror 6**, with a TypeScript language service in a worker.

## Consequences

- Light, modular, suited to the embed and to mobile.
- TS IntelliSense requires assembly (R4).
- Tour line highlighting and diff view to build on its extensions.

## Rejected alternatives

- **Monaco**: better TS IntelliSense out of the box, but heavy and poor on mobile. Chosen if R4 fails.
