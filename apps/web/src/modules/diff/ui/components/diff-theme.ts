import { EditorView } from '@codemirror/view'

const color = (name: string) => `var(--code-${name})`

export const diffTheme = EditorView.theme({
  '&.cm-merge-a .cm-changedLine, .cm-deletedChunk': { backgroundColor: color('diff-deleted-line') },
  '&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine': { backgroundColor: color('diff-added-line') },
  '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText': { background: color('diff-deleted-text') },
  '&:not(.cm-merge-a) .cm-changedText': { background: color('diff-added-text') },
  '.cm-deletedChunk .cm-deletedLine::before': {
    content: '"-"',
    display: 'inline-block',
    width: '1.5ch',
    marginLeft: '-1.5ch',
  },
  '.cm-typika-diff-signs .cm-gutterElement': { width: '1.5ch', textAlign: 'center' },
  '.cm-typika-diff-sign': { color: color('text'), fontWeight: 'bold' },
  '.cm-collapsedLines': { color: color('comment'), backgroundColor: color('active-line') },
})
