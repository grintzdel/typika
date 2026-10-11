import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { isCompletionPending, pendingCompletion } from './pending-completion.ts'

const stateWith = (doc: string) =>
  EditorState.create({ doc, selection: EditorSelection.cursor(doc.length), extensions: pendingCompletion })

const type = (state: EditorState, text: string) =>
  state.update({
    changes: { from: state.doc.length, insert: text },
    selection: EditorSelection.cursor(state.doc.length + text.length),
    userEvent: 'input.type',
  }).state

describe('pendingCompletion', () => {
  it('is not pending in a file that was only opened', () => {
    expect(isCompletionPending(stateWith('const total = 1\n'))).toBe(false)
  })

  it('is pending right after typing', () => {
    expect(isCompletionPending(type(stateWith(''), 'addMon'))).toBe(true)
  })

  it('is no longer pending once the cursor moves away', () => {
    const typed = type(stateWith(''), 'addMon')

    const moved = typed.update({ selection: EditorSelection.cursor(0), userEvent: 'select' }).state

    expect(isCompletionPending(moved)).toBe(false)
  })

  it('is no longer pending after a change that is not typing', () => {
    const typed = type(stateWith(''), 'addMon')

    const pasted = typed.update({ changes: { from: 0, insert: 'x' }, userEvent: 'input.paste' }).state

    expect(isCompletionPending(pasted)).toBe(false)
  })
})
