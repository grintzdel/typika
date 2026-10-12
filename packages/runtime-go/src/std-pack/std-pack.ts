export type StdArchives = ReadonlyMap<string, Uint8Array>

type PackEntry = { readonly importPath: string; readonly offset: number; readonly size: number }

const HEADER_LENGTH_BYTES = 4
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const encodeStdPack = (archives: StdArchives): Uint8Array => {
  let offset = 0
  const entries: Array<PackEntry> = []
  for (const [importPath, archive] of [...archives].toSorted(([a], [b]) => a.localeCompare(b))) {
    entries.push({ importPath, offset, size: archive.byteLength })
    offset += archive.byteLength
  }
  const header = encoder.encode(JSON.stringify(entries))
  const pack = new Uint8Array(HEADER_LENGTH_BYTES + header.byteLength + offset)
  new DataView(pack.buffer).setUint32(0, header.byteLength, true)
  pack.set(header, HEADER_LENGTH_BYTES)
  const dataStart = HEADER_LENGTH_BYTES + header.byteLength
  for (const entry of entries) {
    const archive = archives.get(entry.importPath)
    if (archive !== undefined) pack.set(archive, dataStart + entry.offset)
  }
  return pack
}

const isPackEntry = (value: unknown): value is PackEntry =>
  typeof value === 'object' &&
  value !== null &&
  'importPath' in value &&
  typeof value.importPath === 'string' &&
  'offset' in value &&
  typeof value.offset === 'number' &&
  'size' in value &&
  typeof value.size === 'number'

export const decodeStdPack = (pack: Uint8Array): StdArchives => {
  const view = new DataView(pack.buffer, pack.byteOffset, pack.byteLength)
  const headerLength = view.getUint32(0, true)
  const entries: unknown = JSON.parse(
    decoder.decode(pack.subarray(HEADER_LENGTH_BYTES, HEADER_LENGTH_BYTES + headerLength))
  )
  if (!Array.isArray(entries) || !entries.every(isPackEntry)) throw new Error('Malformed standard library pack.')
  const dataStart = HEADER_LENGTH_BYTES + headerLength
  return new Map(
    entries.map((entry) => [
      entry.importPath,
      pack.subarray(dataStart + entry.offset, dataStart + entry.offset + entry.size),
    ])
  )
}
