import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const color = (name: string) => `var(--code-${name})`

const highlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword, tags.operatorKeyword], color: color('keyword') },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: color('string') },
  { tag: [tags.number, tags.bool, tags.null], color: color('number') },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: color('comment'), fontStyle: 'italic' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: color('type') },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: color('function') },
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: color('property') },
  { tag: tags.heading, fontWeight: 'bold', color: color('keyword') },
  { tag: tags.link, color: color('string'), textDecoration: 'underline' },
  { tag: tags.invalid, color: color('invalid') },
])

export const editorTheme = [
  EditorView.theme({
    '&': { height: '100%', fontSize: '0.875rem', backgroundColor: 'transparent', color: color('text') },
    '.cm-scroller': { fontFamily: 'var(--font-mono)' },
    '.cm-content': { caretColor: color('text') },
    '.cm-cursor': { borderLeftColor: color('text') },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: color('gutter') },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: color('active-line') },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: color('selection') },
    '.cm-matchingBracket': { backgroundColor: color('selection'), outline: 'none' },
  }),
  syntaxHighlighting(highlightStyle),
]
