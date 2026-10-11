import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { highlightedLines, setTourHighlight, tourHighlight } from './tour-highlight.ts'

const DOC = ['a', 'b', 'c', 'd', 'e'].join('\n')

const stateWith = (range: { from: number; to: number } | null) =>
  EditorState.create({ doc: DOC, extensions: [tourHighlight] }).update({ effects: setTourHighlight.of(range) }).state

describe('tour highlight', () => {
  it('highlights every line of the range', () => {
    expect(highlightedLines(stateWith({ from: 2, to: 4 }))).toEqual([2, 3, 4])
  })

  it('clamps the range to the document', () => {
    expect(highlightedLines(stateWith({ from: 4, to: 9 }))).toEqual([4, 5])
  })

  it('clears the highlight', () => {
    const state = stateWith({ from: 2, to: 3 }).update({ effects: setTourHighlight.of(null) }).state

    expect(highlightedLines(state)).toEqual([])
  })

  it('follows the lines when text is inserted above them', () => {
    const state = stateWith({ from: 2, to: 3 }).update({ changes: { from: 0, insert: 'new\n' } }).state

    expect(highlightedLines(state)).toEqual([3, 4])
  })
})
