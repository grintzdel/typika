import { describe, expect, it } from 'vitest'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('async', () => {
  it('awaits a promise', async () => {
    await wait(5)
    expect(await Promise.resolve(42)).toBe(42)
  })

  it('checks resolves and rejects', async () => {
    await expect(Promise.resolve({ id: 1 })).resolves.toEqual({ id: 1 })
    await expect(Promise.reject(new Error('nope'))).rejects.toThrow('nope')
  })

  it('fails on a rejected promise', async () => {
    await wait(1)
    throw new Error('async failure')
  })

  it('times out', async () => {
    await wait(200)
  }, 50)

  it('times out with options', { timeout: 50 }, async () => {
    await wait(200)
  })
})
