import { describe, expect, it } from 'vitest'

import { makeSuiteId, makeTestId } from './make-test-id.ts'

describe('makeTestId', () => {
  it('keeps the same id across runs and versions', () => {
    expect(makeTestId('src/order.test.ts', ['Order', 'total'], 'sums the lines')).toBe(PINNED_TEST_ID)
  })

  it('returns 16 hexadecimal characters', () => {
    expect(makeTestId('a.test.ts', [], 'works')).toMatch(/^[0-9a-f]{16}$/)
  })

  it('tells a suite segment apart from a file segment', () => {
    expect(makeTestId('a/b', [], 'c')).not.toBe(makeTestId('a', ['b'], 'c'))
  })

  it('tells nested suites apart from a name containing a space', () => {
    expect(makeTestId('a.test.ts', ['Order', 'total'], 'x')).not.toBe(makeTestId('a.test.ts', ['Order total'], 'x'))
  })

  it('gives a suite a different id from a test at the same path', () => {
    expect(makeSuiteId('a.test.ts', ['Order'])).not.toBe(makeTestId('a.test.ts', [], 'Order'))
  })
})

const PINNED_TEST_ID = '0c59673691e6329d'
