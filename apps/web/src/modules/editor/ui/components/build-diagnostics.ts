import { linter, type Diagnostic as LintDiagnostic } from '@codemirror/lint'
import { StateEffect, StateField, type EditorState, type Text } from '@codemirror/state'
import type { Diagnostic } from '@typika/runtime-core'

const WORD = /^[\w$]+/

export const setBuildDiagnostics = StateEffect.define<ReadonlyArray<LintDiagnostic>>()

const buildDiagnosticsField = StateField.define<ReadonlyArray<LintDiagnostic>>({
  create: () => [],
  update: (diagnostics, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setBuildDiagnostics)) return effect.value
    if (!transaction.docChanged) return diagnostics
    return diagnostics.map((diagnostic) => ({
      ...diagnostic,
      from: transaction.changes.mapPos(diagnostic.from),
      to: transaction.changes.mapPos(diagnostic.to),
    }))
  },
})

export const buildDiagnosticsOf = (state: EditorState) => state.field(buildDiagnosticsField, false) ?? []

export const buildDiagnostics = [
  buildDiagnosticsField,
  linter((view) => [...buildDiagnosticsOf(view.state)], {
    delay: 0,
    needsRefresh: (update) =>
      update.transactions.some((transaction) => transaction.effects.some((effect) => effect.is(setBuildDiagnostics))),
  }),
]

export const toLintDiagnostics = (doc: Text, diagnostics: ReadonlyArray<Diagnostic>): Array<LintDiagnostic> =>
  diagnostics.flatMap(({ severity, message, location }) => {
    if (location === undefined) return []
    const line = doc.line(Math.min(Math.max(location.line, 1), doc.lines))
    const start = Math.min(line.from + Math.max((location.column ?? 1) - 1, 0), line.to)
    const from = start === line.to && line.length > 0 ? line.to - 1 : start
    const word = WORD.exec(doc.sliceString(from, line.to))?.[0].length ?? 1
    return [{ from, to: Math.min(from + word, line.to), severity, message }]
  })
