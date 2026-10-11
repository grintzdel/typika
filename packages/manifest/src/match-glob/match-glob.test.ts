import { describe, expect, it } from 'vitest'

import { matchGlob } from './match-glob.ts'

describe('matchGlob', () => {
  it.each([
    ['**/*.test.ts', 'quote.test.ts'],
    ['**/*.test.ts', 'tests/deep/quote.test.ts'],
    ['tests/**/*.test.ts', 'tests/quote.test.ts'],
    ['tests/**/*.test.ts', 'tests/a/b/quote.test.ts'],
    ['exercises/**', 'exercises/implement-express/tests/x.test.ts'],
    ['src/?.ts', 'src/a.ts'],
    ['src/a.b+c.ts', 'src/a.b+c.ts'],
  ])('matches %s against %s', (glob, path) => {
    expect(matchGlob(glob)(path)).toBe(true)
  })

  it.each([
    ['tests/*.test.ts', 'tests/a/quote.test.ts'],
    ['tests/**/*.test.ts', 'src/quote.test.ts'],
    ['**/*.test.ts', 'quote.test.tsx'],
    ['src/?.ts', 'src/ab.ts'],
    ['src/a.b.ts', 'src/aXb.ts'],
  ])('does not match %s against %s', (glob, path) => {
    expect(matchGlob(glob)(path)).toBe(false)
  })
})
