import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from 'vitest'

beforeAll(() => {
  console.log('file beforeAll')
})

describe('Order', () => {
  beforeEach(() => {
    console.log('outer beforeEach')
  })
  afterEach(() => {
    console.log('outer afterEach')
  })

  it('passes', () => {
    console.log('inside passes')
    expect(1 + 1).toBe(2)
  })

  it('fails', () => {
    expect({ total: 3 }).toEqual({ total: 4 })
  })

  describe('total', () => {
    beforeAll(() => {
      console.log('inner beforeAll')
    })
    afterAll(() => {
      console.log('inner afterAll')
    })
    beforeEach(() => {
      console.log('inner beforeEach')
    })

    test('sums the lines', () => {
      console.error('to stderr')
      expect([1, 2].reduce((a, b) => a + b, 0)).toBe(3)
    })

    it.skip('is skipped', () => {
      expect(true).toBe(false)
    })

    it.todo('is todo')
  })

  describe.skip('skipped suite', () => {
    it('does not run', () => {
      expect(true).toBe(false)
    })
  })
})

it('runs at the top level', () => {
  expect('typika').toMatch(/pik/)
})

it.each([
  [1, 1, 2],
  [2, 3, 5],
])('adds %i and %i', (a, b, sum) => {
  expect(a + b).toBe(sum)
})

it.each([
  { name: 'standard', cents: 500 },
  { name: 'express', cents: 1500 },
])('prices $name at $cents', ({ cents }) => {
  expect(cents).toBeGreaterThan(0)
})

it.each(['a', 'b'])('letter %s at %#', (letter) => {
  expect(letter).toHaveLength(1)
})

describe.each([['standard'], ['express']])('%s shipping', (kind) => {
  it('has a kind', () => {
    expect(kind).toBeTruthy()
  })
})

it('formats %s literally without each', () => {
  expect(true).toBe(true)
})
