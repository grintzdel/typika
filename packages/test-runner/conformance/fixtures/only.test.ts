import { describe, expect, it } from 'vitest'

it('is filtered out by only', () => {
  expect(true).toBe(true)
})

it.only('runs because of only', () => {
  expect(true).toBe(true)
})

describe.only('focused suite', () => {
  it('runs inside a focused suite', () => {
    expect(true).toBe(true)
  })

  it.skip('stays skipped inside a focused suite', () => {
    expect(true).toBe(true)
  })
})

describe('unfocused suite', () => {
  it('is filtered out too', () => {
    expect(true).toBe(true)
  })
})
