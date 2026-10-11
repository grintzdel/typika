import { StateEffect, StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

export type LineRange = { readonly from: number; readonly to: number }

export const setTourHighlight = StateEffect.define<LineRange | null>()

const highlightedLine = Decoration.line({ class: 'cm-typika-tour-line' })

const decorationsFor = (state: EditorState, range: LineRange): DecorationSet => {
  const last = Math.min(range.to, state.doc.lines)
  const lines = []
  for (let number = Math.max(1, range.from); number <= last; number += 1)
    lines.push(highlightedLine.range(state.doc.line(number).from))
  return Decoration.set(lines)
}

export const tourHighlight = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, transaction) =>
    transaction.effects.reduce(
      (current, effect) =>
        effect.is(setTourHighlight)
          ? effect.value === null
            ? Decoration.none
            : decorationsFor(transaction.state, effect.value)
          : current,
      decorations.map(transaction.changes)
    ),
  provide: (field) => EditorView.decorations.from(field),
})

export const highlightedLines = (state: EditorState): ReadonlyArray<number> => {
  const lines: Array<number> = []
  state.field(tourHighlight).between(0, state.doc.length, (from) => {
    lines.push(state.doc.lineAt(from).number)
  })
  return lines
}

export const scrollToTourHighlight = (view: EditorView) => {
  const first = highlightedLines(view.state)[0]
  if (first === undefined) return
  view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.line(first).from, { y: 'center' }) })
}
