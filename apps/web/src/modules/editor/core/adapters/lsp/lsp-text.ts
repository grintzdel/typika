export type LspPosition = { readonly line: number; readonly character: number }

export type LspRange = { readonly start: LspPosition; readonly end: LspPosition }

export type LspTextEdit = { readonly range: LspRange; readonly newText: string }

const lineStart = (text: string, line: number) => {
  let start = 0
  for (let current = 0; current < line; current += 1) {
    const next = text.indexOf('\n', start)
    if (next === -1) return text.length
    start = next + 1
  }
  return start
}

export const offsetAt = (text: string, { line, character }: LspPosition) => {
  const start = lineStart(text, line)
  const end = text.indexOf('\n', start)
  return Math.min(start + character, end === -1 ? text.length : end)
}

export const positionAt = (text: string, offset: number): LspPosition => {
  const before = text.slice(0, offset)
  const line = before.split('\n').length - 1
  return { line, character: offset - (before.lastIndexOf('\n') + 1) }
}

export const lineTextAt = (text: string, line: number) => {
  const start = lineStart(text, line)
  const end = text.indexOf('\n', start)
  return text.slice(start, end === -1 ? text.length : end)
}

export const changeOf = (text: string, edit: LspTextEdit) => ({
  from: offsetAt(text, edit.range.start),
  to: offsetAt(text, edit.range.end),
  insert: edit.newText,
})

export const applyEdits = (text: string, edits: ReadonlyArray<LspTextEdit>) =>
  edits
    .map((edit) => changeOf(text, edit))
    .toSorted((a, b) => b.from - a.from)
    .reduce((result, change) => result.slice(0, change.from) + change.insert + result.slice(change.to), text)

const WORD = /[\p{L}\p{N}_]/u

export const wordRangeAt = (text: string, offset: number) => {
  let from = offset
  let to = offset
  while (from > 0 && WORD.test(text[from - 1] ?? '')) from -= 1
  while (to < text.length && WORD.test(text[to] ?? '')) to += 1
  return { from, to }
}
