import { StateField, type EditorState } from '@codemirror/state'

export const pendingCompletion = StateField.define<boolean>({
  create: () => false,
  update: (isPending, transaction) => {
    if (transaction.isUserEvent('input.type')) return true
    return transaction.docChanged || transaction.selection !== undefined ? false : isPending
  },
})

export const isCompletionPending = (state: EditorState) => state.field(pendingCompletion, false) ?? false
