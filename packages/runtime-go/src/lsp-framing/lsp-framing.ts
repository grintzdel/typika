const encoder = new TextEncoder()
const decoder = new TextDecoder()
const SEPARATOR = [13, 10, 13, 10]

export const frameLspMessage = (body: string): Uint8Array => {
  const bytes = encoder.encode(body)
  const header = encoder.encode(`Content-Length: ${bytes.byteLength}\r\n\r\n`)
  const framed = new Uint8Array(header.byteLength + bytes.byteLength)
  framed.set(header)
  framed.set(bytes, header.byteLength)
  return framed
}

const indexOfSeparator = (bytes: Uint8Array) => {
  for (let index = 0; index + SEPARATOR.length <= bytes.byteLength; index += 1) {
    if (SEPARATOR.every((byte, offset) => bytes[index + offset] === byte)) return index
  }
  return -1
}

export const makeLspReader = (onMessage: (body: string) => void) => {
  let buffer = new Uint8Array(0)

  const next = () => {
    const separator = indexOfSeparator(buffer)
    if (separator < 0) return false
    const length = Number(/content-length:\s*(\d+)/i.exec(decoder.decode(buffer.subarray(0, separator)))?.[1])
    const start = separator + SEPARATOR.length
    if (!Number.isInteger(length) || buffer.byteLength < start + length) return false
    const body = decoder.decode(buffer.subarray(start, start + length))
    buffer = buffer.slice(start + length)
    onMessage(body)
    return true
  }

  return {
    push: (chunk: Uint8Array) => {
      const joined = new Uint8Array(buffer.byteLength + chunk.byteLength)
      joined.set(buffer)
      joined.set(chunk, buffer.byteLength)
      buffer = joined
      while (next());
    },
  }
}
