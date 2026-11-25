import { describe, expect, it } from 'vitest'

import { matchPaths } from './quick-open.domain-model.ts'

const PATHS = [
  'src/main.ts',
  'src/checkout/quote.ts',
  'src/checkout/options/standard.ts',
  'tests/quote.test.ts',
  'README.md',
]

describe('matchPaths', () => {
  it('lists every path in its order when nothing is typed', () => {
    expect(matchPaths(PATHS, '')).toEqual(PATHS)
  })

  it('keeps the paths whose name holds the typed letters in order, ignoring case', () => {
    expect(matchPaths(PATHS, 'STD')).toEqual(['src/checkout/options/standard.ts'])
  })

  it('ranks a name that holds the text first, the shorter name ahead', () => {
    expect(matchPaths(PATHS, 'quote')).toEqual(['src/checkout/quote.ts', 'tests/quote.test.ts'])
  })

  it('matches letters spread across the folders of a path', () => {
    expect(matchPaths(PATHS, 'chq')).toEqual(['src/checkout/quote.ts'])
  })

  it('ranks a match in the name ahead of a match in the folders', () => {
    expect(matchPaths(['src/checkout/options/standard.ts', 'src/checkout.ts'], 'checkout')).toEqual([
      'src/checkout.ts',
      'src/checkout/options/standard.ts',
    ])
  })
})
