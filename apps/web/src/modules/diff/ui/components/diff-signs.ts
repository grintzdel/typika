import { getChunks } from '@codemirror/merge'
import type { EditorState } from '@codemirror/state'
import { gutter, GutterMarker } from '@codemirror/view'

export type DiffSign = '+' | '-'

export const diffSignOf = (state: EditorState, lineStart: number): DiffSign | undefined => {
  const diff = getChunks(state)
  if (diff === null || diff.side === null) return undefined
  const isA = diff.side === 'a'
  const inChunk = diff.chunks.some((chunk) =>
    isA ? chunk.fromA <= lineStart && lineStart < chunk.toA : chunk.fromB <= lineStart && lineStart < chunk.toB
  )
  if (!inChunk) return undefined
  return isA ? '-' : '+'
}

class SignMarker extends GutterMarker {
  readonly sign: DiffSign

  constructor(sign: DiffSign) {
    super()
    this.sign = sign
  }

  override eq(other: GutterMarker) {
    return other instanceof SignMarker && other.sign === this.sign
  }

  override toDOM() {
    const element = document.createElement('span')
    element.className = 'cm-typika-diff-sign'
    element.textContent = this.sign
    return element
  }
}

const MARKERS = { '+': new SignMarker('+'), '-': new SignMarker('-') }

export const diffSigns = gutter({
  class: 'cm-typika-diff-signs',
  lineMarker: (view, line) => {
    const sign = diffSignOf(view.state, line.from)
    return sign === undefined ? null : MARKERS[sign]
  },
  lineMarkerChange: (update) => getChunks(update.startState)?.chunks !== getChunks(update.state)?.chunks,
})
