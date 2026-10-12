import { describe, expect, it } from 'vitest'

import { decodeStdPack, encodeStdPack } from './std-pack.ts'

describe('std pack', () => {
  it('decodes the archives it encoded', () => {
    const archives = new Map([
      ['fmt', new Uint8Array([1, 2, 3])],
      ['errors', new Uint8Array([4])],
      ['internal/abi', new Uint8Array([])],
    ])

    const decoded = decodeStdPack(encodeStdPack(archives))

    expect([...decoded.keys()]).toEqual(['errors', 'fmt', 'internal/abi'])
    expect([...(decoded.get('fmt') ?? [])]).toEqual([1, 2, 3])
    expect(decoded.get('internal/abi')?.byteLength).toBe(0)
  })

  it('rejects a pack whose header is not a list of entries', () => {
    const header = new TextEncoder().encode('{"fmt":1}')
    const pack = new Uint8Array(4 + header.byteLength)
    new DataView(pack.buffer).setUint32(0, header.byteLength, true)
    pack.set(header, 4)

    expect(() => decodeStdPack(pack)).toThrow('Malformed')
  })
})
