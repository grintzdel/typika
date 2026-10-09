import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('beforeAll throws', () => {
  beforeAll(() => {
    throw new Error('beforeAll failed')
  })

  it('first test', () => {
    expect(true).toBe(true)
  })

  it('second test', () => {
    expect(true).toBe(true)
  })
})

describe('beforeEach throws', () => {
  beforeEach(() => {
    throw new Error('beforeEach failed')
  })

  it('test under a failing beforeEach', () => {
    expect(true).toBe(true)
  })
})

describe('afterEach throws', () => {
  afterEach(() => {
    throw new Error('afterEach failed')
  })

  it('test under a failing afterEach', () => {
    expect(true).toBe(true)
  })
})
