import { expect, it, vi } from 'vitest'

class Money {
  readonly cents: number

  constructor(cents: number) {
    this.cents = cents
  }
}

const named = function fail() {
  throw new TypeError('bad input')
}

it('toBe num', () => {
  expect(1).toBe(2)
})

it('toBe str', () => {
  expect('a').toBe('b')
})

it('not toBe', () => {
  expect(1).not.toBe(1)
})

it('toBe obj', () => {
  expect({ a: 1 }).toBe({ a: 1 })
})

it('toEqual long', () => {
  expect({ alpha: 1, beta: 2, gamma: 3, delta: 'four' }).toEqual({ alpha: 1 })
})

it('toEqual long arr', () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toEqual([1])
})

it('toEqual nested', () => {
  expect({ a: { b: { c: [1, 'x'] } } }).toEqual({})
})

it('not toEqual', () => {
  expect({ a: 1 }).not.toEqual({ a: 1 })
})

it('toStrictEqual', () => {
  expect({ a: undefined }).toStrictEqual({})
})

it('not toStrictEqual', () => {
  expect(1).not.toStrictEqual(1)
})

it('types', () => {
  expect([
    undefined,
    null,
    true,
    1n,
    Symbol('s'),
    -0,
    NaN,
    new Date(0),
    /x/g,
    () => 1,
    named,
    new Map([['a', 1]]),
    new Set([1]),
    new Error('e'),
    new TypeError('t'),
    new Money(1),
    Object.create(null),
    [],
    {},
  ]).toEqual(0)
})

it('nested str', () => {
  expect({ s: 'it\'s "q"' }).toEqual(0)
})

it('toBeTruthy', () => {
  expect(0).toBeTruthy()
})

it('not toBeTruthy', () => {
  expect(1).not.toBeTruthy()
})

it('toBeFalsy', () => {
  expect(1).toBeFalsy()
})

it('not toBeFalsy', () => {
  expect(0).not.toBeFalsy()
})

it('toBeNull', () => {
  expect(1).toBeNull()
})

it('not toBeNull', () => {
  expect(null).not.toBeNull()
})

it('toBeUndefined', () => {
  expect(1).toBeUndefined()
})

it('not toBeUndefined', () => {
  expect(undefined).not.toBeUndefined()
})

it('toBeDefined', () => {
  expect(undefined).toBeDefined()
})

it('not toBeDefined', () => {
  expect(1).not.toBeDefined()
})

it('toBeInstanceOf', () => {
  expect({}).toBeInstanceOf(Money)
})

it('not toBeInstanceOf', () => {
  expect(new Money(1)).not.toBeInstanceOf(Money)
})

it('toContain arr', () => {
  expect([1, 2]).toContain(3)
})

it('toContain str', () => {
  expect('abc').toContain('x')
})

it('not toContain str', () => {
  expect('abc').not.toContain('b')
})

it('toContainEqual', () => {
  expect([{ a: 1 }]).toContainEqual({ a: 2 })
})

it('not toContainEqual', () => {
  expect([{ a: 1 }]).not.toContainEqual({ a: 1 })
})

it('toHaveLength', () => {
  expect('abc').toHaveLength(2)
})

it('not toHaveLength', () => {
  expect('abc').not.toHaveLength(3)
})

it('toHaveProperty', () => {
  expect({ a: 1 }).toHaveProperty('b')
})

it('toHaveProperty path', () => {
  expect({ a: { b: 1 } }).toHaveProperty('a.b', 2)
})

it('toHaveProperty arr', () => {
  expect({ a: { b: 1 } }).toHaveProperty(['a', 'c'])
})

it('not toHaveProperty', () => {
  expect({ a: 1 }).not.toHaveProperty('a')
})

it('not toHaveProperty val', () => {
  expect({ a: 1 }).not.toHaveProperty('a', 1)
})

it('toMatch re', () => {
  expect('abc').toMatch(/x/)
})

it('toMatch str', () => {
  expect('abc').toMatch('x')
})

it('not toMatch', () => {
  expect('abc').not.toMatch(/b/)
})

it('toMatchObject', () => {
  expect({ a: 1, b: 2 }).toMatchObject({ a: 2 })
})

it('not toMatchObject', () => {
  expect({ a: 1 }).not.toMatchObject({ a: 1 })
})

it('toThrow none', () => {
  expect(() => 1).toThrow()
})

it('toThrow named none', () => {
  expect(function quiet() {}).toThrow('x')
})

it('toThrow str', () => {
  expect(named).toThrow('nope')
})

it('toThrow re', () => {
  expect(named).toThrow(/nope/)
})

it('toThrow class', () => {
  expect(named).toThrow(RangeError)
})

it('toThrow inst', () => {
  expect(named).toThrow(new TypeError('other'))
})

it('not toThrow', () => {
  expect(named).not.toThrow()
})

it('not toThrow str', () => {
  expect(named).not.toThrow('bad')
})

it('toThrow non fn', () => {
  expect(1).toThrow()
})

it('gt', () => {
  expect(1).toBeGreaterThan(2)
})

it('gte', () => {
  expect(1).toBeGreaterThanOrEqual(2)
})

it('lt', () => {
  expect(2).toBeLessThan(1)
})

it('lte', () => {
  expect(2).toBeLessThanOrEqual(1)
})

it('not gt', () => {
  expect(2).not.toBeGreaterThan(1)
})

it('closeTo', () => {
  expect(0.3).toBeCloseTo(0.5)
})

it('closeTo digits', () => {
  expect(0.3).toBeCloseTo(0.31, 3)
})

it('not closeTo', () => {
  expect(0.3).not.toBeCloseTo(0.3)
})

it('called', () => {
  expect(vi.fn()).toHaveBeenCalled()
})

it('not called', () => {
  const f = vi.fn()
  f()
  expect(f).not.toHaveBeenCalled()
})

it('called named', () => {
  expect(vi.fn().mockName('notify')).toHaveBeenCalled()
})

it('spy name', () => {
  const o = { now: () => 1 }
  expect(vi.spyOn(o, 'now')).toHaveBeenCalled()
})

it('times', () => {
  const f = vi.fn()
  f()
  expect(f).toHaveBeenCalledTimes(2)
})

it('not times', () => {
  const f = vi.fn()
  f()
  expect(f).not.toHaveBeenCalledTimes(1)
})

it('once', () => {
  expect(vi.fn()).toHaveBeenCalledOnce()
})

it('not once', () => {
  const f = vi.fn()
  f()
  expect(f).not.toHaveBeenCalledOnce()
})

it('with', () => {
  const f = vi.fn()
  f('b', 2)
  expect(f).toHaveBeenCalledWith('a', 1)
})

it('not with', () => {
  const f = vi.fn()
  f('a')
  expect(f).not.toHaveBeenCalledWith('a')
})

it('last', () => {
  const f = vi.fn()
  f('b')
  expect(f).toHaveBeenLastCalledWith('a')
})

it('nth', () => {
  const f = vi.fn()
  f('b')
  expect(f).toHaveBeenNthCalledWith(1, 'a')
})

it('nth 2', () => {
  const f = vi.fn()
  f('b')
  expect(f).toHaveBeenNthCalledWith(2, 'a')
})

it('returned', () => {
  expect(vi.fn()).toHaveReturned()
})

it('returnedWith', () => {
  const f = vi.fn(() => 1)
  f()
  expect(f).toHaveReturnedWith(2)
})

it('not fn', () => {
  expect(1).toHaveBeenCalled()
})

it('resolves non promise', async () => {
  await expect(1).resolves.toBe(1)
})

it('resolves rejected', async () => {
  await expect(Promise.reject(new Error('x'))).resolves.toBe(1)
})

it('rejects resolved', async () => {
  await expect(Promise.resolve(1)).rejects.toBe(1)
})

it('resolves fail', async () => {
  await expect(Promise.resolve(1)).resolves.toBe(2)
})

it('throw string', () => {
  throw 'plain string'
})

it('throw object', () => {
  throw { code: 1 }
})

it('any', () => {
  expect({ a: 'x' }).toEqual({ a: expect.any(Number) })
})

it('oc', () => {
  expect(1).toEqual(expect.objectContaining({ a: 1 }))
})
