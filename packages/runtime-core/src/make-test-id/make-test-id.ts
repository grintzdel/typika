const FNV_OFFSET_BASIS = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const UINT64_MASK = 0xffffffffffffffffn
const SEPARATOR = '\u0000'
const encoder = new TextEncoder()

// FNV-1a rather than effect/Hash: exercise progress persists these ids, so they must not change with Effect upgrades.
const fnv1a64 = (input: string): string => {
  let hash = FNV_OFFSET_BASIS
  for (const byte of encoder.encode(input)) {
    hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & UINT64_MASK
  }
  return hash.toString(16).padStart(16, '0')
}

const idOf = (kind: 'suite' | 'test', file: string, path: ReadonlyArray<string>): string =>
  fnv1a64([kind, file, ...path].join(SEPARATOR))

export const makeTestId = (file: string, suitePath: ReadonlyArray<string>, name: string): string =>
  idOf('test', file, [...suitePath, name])

export const makeSuiteId = (file: string, suitePath: ReadonlyArray<string>): string => idOf('suite', file, suitePath)
