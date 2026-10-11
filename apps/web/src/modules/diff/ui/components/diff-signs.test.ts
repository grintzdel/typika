import { unifiedMergeView } from '@codemirror/merge'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { diffSignOf } from './diff-signs.ts'

const unified = (original: string, doc: string) =>
  EditorState.create({ doc, extensions: [unifiedMergeView({ original, mergeControls: false })] })

const signs = (state: EditorState) =>
  Array.from({ length: state.doc.lines }, (_, index) => diffSignOf(state, state.doc.line(index + 1).from))

describe('diffSignOf', () => {
  it('marks the inserted and changed lines with a plus', () => {
    expect(signs(unified('a\nb\nc\n', 'a\nB\nc\nd\n'))).toEqual([undefined, '+', undefined, '+', undefined])
  })

  it('marks nothing without a diff', () => {
    expect(signs(EditorState.create({ doc: 'a\nb' }))).toEqual([undefined, undefined])
  })
})
