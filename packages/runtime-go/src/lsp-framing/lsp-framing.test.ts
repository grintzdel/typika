import { describe, expect, it } from 'vitest'

import { frameLspMessage, makeLspReader } from './lsp-framing.ts'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

const readAll = (chunks: ReadonlyArray<Uint8Array>) => {
  const messages: Array<string> = []
  const reader = makeLspReader((message) => messages.push(message))
  for (const chunk of chunks) reader.push(chunk)
  return messages
}

describe('frameLspMessage', () => {
  it('prefixes the body with its length in bytes', () => {
    expect(text(frameLspMessage('{"label":"é"}'))).toBe('Content-Length: 14\r\n\r\n{"label":"é"}')
  })
})

describe('makeLspReader', () => {
  it('reads several messages from one chunk', () => {
    const bytes = new Uint8Array([...frameLspMessage('{"id":1}'), ...frameLspMessage('{"id":2}')])

    expect(readAll([bytes])).toEqual(['{"id":1}', '{"id":2}'])
  })

  it('waits for the rest of a message split across chunks, multibyte characters included', () => {
    const bytes = frameLspMessage('{"detail":"→ ok"}')
    const chunks = [bytes.subarray(0, 10), bytes.subarray(10, 33), bytes.subarray(33)]

    expect(readAll(chunks)).toEqual(['{"detail":"→ ok"}'])
  })

  it('reads headers other than the length', () => {
    const bytes = new TextEncoder().encode(
      'Content-Type: application/vscode-jsonrpc; charset=utf-8\r\nContent-Length: 2\r\n\r\n{}'
    )

    expect(readAll([bytes])).toEqual(['{}'])
  })
})
