import { describe, expect, it } from 'vitest'

class Money {
  readonly cents: number

  constructor(cents: number) {
    this.cents = cents
  }
}

describe('passing matchers', () => {
  it('compares values', () => {
    expect(NaN).toBe(NaN)
    expect({ a: 1, b: undefined }).toEqual({ a: 1 })
    expect(new Money(5)).toEqual({ cents: 5 })
    expect(new Money(5)).toStrictEqual(new Money(5))
    expect([1, [2, { c: new Date(0) }]]).toEqual([1, [2, { c: new Date(0) }]])
    expect(new Map([['a', { b: 1 }]])).toEqual(new Map([['a', { b: 1 }]]))
    expect(new Set([1, 2])).toEqual(new Set([2, 1]))
    expect(1).toBeTruthy()
    expect(0).toBeFalsy()
    expect(null).toBeNull()
    expect(undefined).toBeUndefined()
    expect('x').toBeDefined()
    expect(new Money(1)).toBeInstanceOf(Money)
    expect([1, 2, 3]).toContain(2)
    expect('typika').toContain('pik')
    expect([{ id: 1 }]).toContainEqual({ id: 1 })
    expect('abc').toHaveLength(3)
    expect({ order: { lines: [{ sku: 'a' }] } }).toHaveProperty('order.lines[0].sku', 'a')
    expect({ order: { id: 1 } }).toHaveProperty(['order', 'id'])
    expect('typika').toMatch('pik')
    expect({ id: 1, lines: [{ sku: 'a', qty: 2 }] }).toMatchObject({ lines: [{ sku: 'a' }] })
    expect(2).toBeGreaterThan(1)
    expect(2).toBeGreaterThanOrEqual(2)
    expect(1).toBeLessThan(2)
    expect(1).toBeLessThanOrEqual(1)
    expect(0.1 + 0.2).toBeCloseTo(0.3)
    expect(1).not.toBe(2)
    expect({ a: 1 }).not.toEqual({ a: 2 })
  })

  it('checks thrown errors', () => {
    const fail = () => {
      throw new TypeError('bad input')
    }

    expect(fail).toThrow()
    expect(fail).toThrow('bad')
    expect(fail).toThrow(/input$/)
    expect(fail).toThrow(TypeError)
    expect(fail).toThrow(new TypeError('bad input'))
    expect(() => 1).not.toThrow()
  })

  it('accepts asymmetric matchers', () => {
    expect({ id: 7, at: new Date(0), tags: ['a', 'b'], label: 'order-7' }).toEqual({
      id: expect.any(Number),
      at: expect.anything(),
      tags: expect.arrayContaining(['b']),
      label: expect.stringContaining('order'),
    })
    expect({ id: 7, name: 'x' }).toEqual(expect.objectContaining({ id: 7 }))
    expect('order-7').toEqual(expect.stringMatching(/^order-\d$/))
  })
})

describe('failing matchers', () => {
  it('toBe', () => {
    expect(1).toBe(2)
  })

  it('toStrictEqual with a class', () => {
    expect(new Money(5)).toStrictEqual({ cents: 5 })
  })

  it('not.toContain', () => {
    expect([1, 2]).not.toContain(2)
  })

  it('toThrow without throwing', () => {
    expect(() => 1).toThrow()
  })

  it('toHaveLength', () => {
    expect([1]).toHaveLength(2)
  })
})
