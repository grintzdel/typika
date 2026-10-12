import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { buildDiagnostics, buildDiagnosticsOf, setBuildDiagnostics, toLintDiagnostics } from './build-diagnostics.ts'

const DOC = ['package main', '', 'func main() {', '\tundefinedCall()', '}'].join('\n')

const stateWith = (doc = DOC) => {
  const state = EditorState.create({ doc, extensions: [buildDiagnostics] })
  return state.update({
    effects: setBuildDiagnostics.of(
      toLintDiagnostics(state.doc, [
        {
          severity: 'error',
          message: 'undefined: undefinedCall',
          location: { file: 'main.go', line: 4, column: 2 },
        },
      ])
    ),
  }).state
}

const rangeOf = (state: EditorState) =>
  buildDiagnosticsOf(state).map((diagnostic) => state.doc.sliceString(diagnostic.from, diagnostic.to))

describe('build diagnostics', () => {
  it('underlines the word at the reported line and column', () => {
    const state = stateWith()

    expect(rangeOf(state)).toEqual(['undefinedCall'])
    expect(buildDiagnosticsOf(state)[0]).toMatchObject({ severity: 'error', message: 'undefined: undefinedCall' })
  })

  it('follows the code when text is inserted above it', () => {
    const state = stateWith().update({ changes: { from: 0, insert: '// header\n' } }).state

    expect(rangeOf(state)).toEqual(['undefinedCall'])
  })

  it('clamps a location past the end of the document', () => {
    const state = EditorState.create({ doc: 'a' })

    expect(
      toLintDiagnostics(state.doc, [{ severity: 'error', message: 'eof', location: { file: 'a', line: 9, column: 4 } }])
    ).toEqual([{ from: 0, to: 1, severity: 'error', message: 'eof' }])
  })

  it('leaves out diagnostics without a location', () => {
    expect(toLintDiagnostics(EditorState.create({ doc: 'a' }).doc, [{ severity: 'error', message: 'x' }])).toEqual([])
  })
})
