import { afterAll, describe, expect, it } from 'vitest'

describe('afterAll throws', () => {
  afterAll(() => {
    throw new Error('afterAll failed')
  })

  it('still passes', () => {
    expect(true).toBe(true)
  })
})

describe('non-error throws', () => {
  it('throws a string', () => {
    throw 'plain string'
  })

  it('throws an object', () => {
    throw { code: 42 }
  })
})

describe('nested only', () => {
  describe.only('focused', () => {
    it('runs', () => {
      expect(true).toBe(true)
    })

    it.only('runs as only', () => {
      expect(true).toBe(true)
    })
  })

  it('is not focused', () => {
    expect(true).toBe(true)
  })
})

describe.todo('todo suite')

describe('empty suite', () => {})
