export type TarEntry = { readonly path: string; readonly content: Uint8Array }

const BLOCK = 512
const decoder = new TextDecoder()

const textAt = (header: Uint8Array, start: number, length: number) => {
  const field = header.subarray(start, start + length)
  const end = field.indexOf(0)
  return decoder.decode(end === -1 ? field : field.subarray(0, end))
}

const octalAt = (header: Uint8Array, start: number, length: number) =>
  Number.parseInt(textAt(header, start, length).trim() || '0', 8)

const paxPathOf = (data: Uint8Array): string | undefined => {
  let offset = 0
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset)
    if (space === -1) return undefined
    const length = Number(decoder.decode(data.subarray(offset, space)))
    if (!Number.isInteger(length) || length <= 0) return undefined
    const record = decoder.decode(data.subarray(space + 1, offset + length - 1))
    if (record.startsWith('path=')) return record.slice('path='.length)
    offset += length
  }
  return undefined
}

export const readTar = (archive: Uint8Array): ReadonlyArray<TarEntry> => {
  const entries: Array<TarEntry> = []
  let nextPath: string | undefined
  let offset = 0
  while (offset + BLOCK <= archive.length) {
    const header = archive.subarray(offset, offset + BLOCK)
    if (header.every((byte) => byte === 0)) break
    const size = octalAt(header, 124, 12)
    const type = String.fromCharCode(header[156] ?? 0)
    const data = archive.subarray(offset + BLOCK, offset + BLOCK + size)
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK
    if (type === 'x') {
      nextPath = paxPathOf(data) ?? nextPath
      continue
    }
    if (type === 'L') {
      nextPath = textAt(data, 0, data.length)
      continue
    }
    if (type === 'g') continue
    const prefix = textAt(header, 345, 155)
    const name = textAt(header, 0, 100)
    const path = nextPath ?? (prefix === '' ? name : `${prefix}/${name}`)
    nextPath = undefined
    if (type === '0' || type === '\0') entries.push({ path, content: new Uint8Array(data) })
  }
  return entries
}
