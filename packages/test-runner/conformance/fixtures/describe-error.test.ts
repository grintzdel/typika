import { describe, expect, it } from 'vitest'

describe('describe body throws', () => {
  it('collected before the error', () => {
    expect(true).toBe(true)
  })

  throw new Error('describe failed')
})
