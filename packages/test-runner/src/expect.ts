import { AssertionError } from './assertion-error.ts'
import {
  any,
  anything,
  arrayContaining,
  objectContaining,
  stringContaining,
  stringMatching,
  type AsymmetricMatcher,
} from './asymmetric.ts'
import { equals, subsetEquals } from './equals.ts'
import { inspect } from './inspect.ts'
import { isMockFunction, type Mock, type Procedure } from './mock.ts'

type Constructor = abstract new (...args: never[]) => unknown
type ThrowExpectation = string | RegExp | Constructor | Error | AsymmetricMatcher

type Mode = 'value' | 'resolves' | 'rejects'

type Outcome = {
  readonly pass: boolean
  readonly message: (negated: boolean) => string
  readonly expected?: unknown
  readonly actual?: unknown
}

export interface Matchers<R> {
  toBe(expected: unknown): R
  toEqual(expected: unknown): R
  toStrictEqual(expected: unknown): R
  toBeTruthy(): R
  toBeFalsy(): R
  toBeNull(): R
  toBeUndefined(): R
  toBeDefined(): R
  toBeNaN(): R
  toBeTypeOf(type: 'bigint' | 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined'): R
  toBeInstanceOf(expected: Constructor): R
  toContain(item: unknown): R
  toContainEqual(item: unknown): R
  toHaveLength(length: number): R
  toHaveProperty(path: string | ReadonlyArray<string | number>, value?: unknown): R
  toMatch(expected: string | RegExp): R
  toMatchObject(expected: object): R
  toThrow(expected?: ThrowExpectation): R
  toThrowError(expected?: ThrowExpectation): R
  toBeGreaterThan(expected: number | bigint): R
  toBeGreaterThanOrEqual(expected: number | bigint): R
  toBeLessThan(expected: number | bigint): R
  toBeLessThanOrEqual(expected: number | bigint): R
  toBeCloseTo(expected: number, digits?: number): R
  toHaveBeenCalled(): R
  toHaveBeenCalledTimes(times: number): R
  toHaveBeenCalledOnce(): R
  toHaveBeenCalledWith(...args: Array<unknown>): R
  toHaveBeenCalledExactlyOnceWith(...args: Array<unknown>): R
  toHaveBeenLastCalledWith(...args: Array<unknown>): R
  toHaveBeenNthCalledWith(nth: number, ...args: Array<unknown>): R
  toHaveReturned(): R
  toHaveReturnedWith(value: unknown): R
}

export interface Assertion<T = unknown> extends Matchers<void> {
  readonly not: Assertion<T>
  readonly resolves: PromisifiedAssertion
  readonly rejects: PromisifiedAssertion
}

export interface PromisifiedAssertion extends Matchers<Promise<void>> {
  readonly not: PromisifiedAssertion
}

export interface ExpectStatic {
  <T>(actual: T): Assertion<T>
  any: typeof any
  anything: typeof anything
  arrayContaining: typeof arrayContaining
  objectContaining: typeof objectContaining
  stringContaining: typeof stringContaining
  stringMatching: typeof stringMatching
}

const show = (value: unknown) => inspect(value)

const ordinal = (n: number) => {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

const not = (negated: boolean, word = 'not ') => (negated ? word : '')

const lengthOf = (value: unknown): number | undefined => {
  if (typeof value === 'string') return value.length
  if (typeof value === 'object' && value !== null && 'length' in value && typeof value.length === 'number') {
    return value.length
  }
  return undefined
}

const itemsOf = (value: unknown): ReadonlyArray<unknown> => {
  if (Array.isArray(value)) return value
  if (value instanceof Set || value instanceof Map) return [...(value as Iterable<unknown>)]
  return []
}

const pathOf = (path: unknown): ReadonlyArray<string> => {
  if (typeof path === 'string') {
    return path
      .replace(/\[(\w+)\]/g, '.$1')
      .split('.')
      .filter((segment) => segment !== '')
  }
  if (Array.isArray(path)) return path.map(String)
  throw new TypeError(`toHaveProperty expects a string or an array path, but received ${show(path)}`)
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const numberArg = (value: unknown, matcher: string): number | bigint => {
  if (typeof value === 'number' || typeof value === 'bigint') return value
  throw new TypeError(`${matcher} expects a number or bigint, but received ${show(value)}`)
}

const spyOf = (actual: unknown): Mock<Procedure> => {
  if (!isMockFunction(actual)) throw new TypeError(`${show(actual)} is not a spy or a call to a spy!`)
  return actual
}

const spyName = (spy: Mock<Procedure>) => `"${spy.getMockName()}"`

const compare = (
  actual: unknown,
  value: unknown,
  label: string,
  test: (a: number | bigint, b: number | bigint) => boolean
): Outcome => {
  const expected = numberArg(value, label)
  if (typeof actual !== 'number' && typeof actual !== 'bigint') {
    throw new AssertionError(`expected ${show(actual)} to be a number or bigint`)
  }
  return {
    pass: test(actual, expected),
    message: (negated) => `expected ${show(actual)} to be ${not(negated)}${label} ${show(expected)}`,
    expected,
    actual,
  }
}

const throwOutcome = (actual: unknown, mode: Mode, expected: unknown): Outcome => {
  let thrown: unknown
  let didThrow = false
  if (mode === 'rejects') {
    thrown = actual
    didThrow = true
  } else {
    if (typeof actual !== 'function') throw new AssertionError(`expected ${show(actual)} to be a function`)
    try {
      ;(actual as () => unknown)()
    } catch (error) {
      thrown = error
      didThrow = true
    }
  }
  const subject = show(actual)

  if (expected === undefined) {
    return {
      pass: didThrow,
      message: (negated) =>
        negated
          ? `expected ${subject} to not throw an error but ${show(String(thrown))} was thrown`
          : `expected ${subject} to throw an error`,
    }
  }
  if (!didThrow) {
    return { pass: false, message: () => `expected ${subject} to throw an error` }
  }
  if (typeof expected === 'string' || expected instanceof RegExp) {
    const message = messageOf(thrown)
    const isString = typeof expected === 'string'
    const verb = isString ? 'including' : 'matching'
    return {
      pass: isString ? message.includes(expected) : expected.test(message),
      message: (negated) =>
        negated
          ? `expected ${subject} to throw error not ${verb} ${show(expected)}`
          : `expected ${subject} to throw error ${verb} ${show(expected)} but got ${show(message)}`,
      expected,
      actual: message,
    }
  }
  if (typeof expected === 'function') {
    return {
      pass: thrown instanceof expected,
      message: (negated) => `expected error ${not(negated)}to be instance of ${expected.name}`,
      expected,
      actual: thrown,
    }
  }
  if (expected instanceof Error) {
    return {
      pass: thrown instanceof Error && thrown.message === expected.message,
      message: (negated) => `expected a thrown error ${not(negated)}to be ${show(expected)}`,
      expected,
      actual: thrown,
    }
  }
  return {
    pass: subsetEquals(thrown, expected),
    message: (negated) => `expected a thrown value ${not(negated)}to match ${show(expected)}`,
    expected,
    actual: thrown,
  }
}

const calledWith = (spy: Mock<Procedure>, args: ReadonlyArray<unknown>) =>
  spy.mock.calls.some((call) => equals(call, args))

const outcomeOf = (name: keyof Matchers<void>, actual: unknown, mode: Mode, args: ReadonlyArray<unknown>): Outcome => {
  const [first, second] = args
  const a = show(actual)
  switch (name) {
    case 'toBe':
      return {
        pass: Object.is(actual, first),
        message: (negated) => `expected ${a} ${negated ? 'not ' : ''}to be ${show(first)} // Object.is equality`,
        expected: first,
        actual,
      }
    case 'toEqual':
      return {
        pass: equals(actual, first),
        message: (negated) => `expected ${a} to ${not(negated)}deeply equal ${show(first)}`,
        expected: first,
        actual,
      }
    case 'toStrictEqual':
      return {
        pass: equals(actual, first, true),
        message: (negated) => `expected ${a} to ${not(negated)}strictly equal ${show(first)}`,
        expected: first,
        actual,
      }
    case 'toBeTruthy':
      return { pass: Boolean(actual), message: (negated) => `expected ${a} to ${not(negated)}be truthy` }
    case 'toBeFalsy':
      return { pass: !actual, message: (negated) => `expected ${a} to ${not(negated)}be falsy` }
    case 'toBeNull':
      return { pass: actual === null, message: (negated) => `expected ${a} ${not(negated)}to be null` }
    case 'toBeUndefined':
      return { pass: actual === undefined, message: (negated) => `expected ${a} ${not(negated)}to be undefined` }
    case 'toBeDefined':
      return {
        pass: actual !== undefined,
        message: (negated) => `expected ${a} to be ${negated ? 'undefined' : 'defined'}`,
      }
    case 'toBeNaN':
      return { pass: Number.isNaN(actual), message: (negated) => `expected ${a} ${not(negated)}to be NaN` }
    case 'toBeTypeOf':
      return {
        pass: typeof actual === first,
        message: (negated) => `expected ${a} ${not(negated)}to be type of ${show(first)}`,
        expected: first,
        actual: typeof actual,
      }
    case 'toBeInstanceOf': {
      if (typeof first !== 'function')
        throw new TypeError(`toBeInstanceOf expects a class, but received ${show(first)}`)
      return {
        pass: actual instanceof first,
        message: (negated) => `expected ${a} to ${not(negated)}be an instance of ${first.name}`,
      }
    }
    case 'toContain': {
      if (typeof actual === 'string') {
        return {
          pass: actual.includes(String(first)),
          message: (negated) => `expected ${a} ${not(negated)}to contain ${show(first)}`,
          expected: first,
          actual,
        }
      }
      const items = itemsOf(actual)
      return {
        pass: items.includes(first),
        message: (negated) => `expected ${a} to ${not(negated)}include ${show(first)}`,
      }
    }
    case 'toContainEqual': {
      const items = itemsOf(actual)
      return {
        pass: items.some((item) => equals(item, first)),
        message: (negated) => `expected ${a} to ${not(negated)}deep equally contain ${show(first)}`,
        expected: first,
        actual,
      }
    }
    case 'toHaveLength': {
      const length = lengthOf(actual)
      if (length === undefined) throw new TypeError(`${a} does not have property "length"`)
      return {
        pass: length === first,
        message: (negated) =>
          negated
            ? `expected ${a} to not have a length of ${show(first)}`
            : `expected ${a} to have a length of ${show(first)} but got ${length}`,
        expected: first,
        actual: length,
      }
    }
    case 'toHaveProperty': {
      const path = pathOf(first)
      let current: unknown = actual
      let found = true
      for (const key of path) {
        if (current === null || (typeof current !== 'object' && typeof current !== 'function') || !(key in current)) {
          found = false
          break
        }
        current = Reflect.get(current, key)
      }
      const label = `"${path.join('.')}"`
      const checksValue = args.length > 1
      return {
        pass: found && (!checksValue || equals(current, second)),
        message: (negated) =>
          `expected ${a} to ${not(negated)}have property ${label}${checksValue ? ` with value ${show(second)}` : ''}`,
        ...(checksValue ? { expected: second, actual: current } : {}),
      }
    }
    case 'toMatch': {
      if (typeof actual !== 'string')
        throw new TypeError(`.toMatch() expects to receive a string, but got ${typeof actual}`)
      const pattern = first
      if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
        throw new TypeError(`.toMatch() expects a string or a RegExp, but received ${show(pattern)}`)
      }
      return {
        pass: typeof pattern === 'string' ? actual.includes(pattern) : pattern.test(actual),
        message: (negated) => `expected ${a} ${not(negated)}to match ${show(pattern)}`,
        expected: pattern,
        actual,
      }
    }
    case 'toMatchObject':
      return {
        pass: subsetEquals(actual, first),
        message: (negated) => `expected ${a} to ${not(negated)}match object ${show(first)}`,
        expected: first,
        actual,
      }
    case 'toThrow':
    case 'toThrowError':
      return throwOutcome(actual, mode, first)
    case 'toBeGreaterThan':
      return compare(actual, first, 'greater than', (x, y) => x > y)
    case 'toBeGreaterThanOrEqual':
      return compare(actual, first, 'greater than or equal to', (x, y) => x >= y)
    case 'toBeLessThan':
      return compare(actual, first, 'less than', (x, y) => x < y)
    case 'toBeLessThanOrEqual':
      return compare(actual, first, 'less than or equal to', (x, y) => x <= y)
    case 'toBeCloseTo': {
      const expected = Number(numberArg(first, 'toBeCloseTo'))
      const digits = typeof second === 'number' ? second : 2
      const precision = 10 ** -digits / 2
      const difference = Math.abs(Number(actual) - expected)
      const pass =
        (actual === Infinity && expected === Infinity) ||
        (actual === -Infinity && expected === -Infinity) ||
        difference < precision
      return {
        pass,
        message: (negated) =>
          `expected ${String(actual)} to ${not(negated)}be close to ${expected}, received difference is ${difference}, but expected ${precision}`,
        expected,
        actual,
      }
    }
    case 'toHaveBeenCalled': {
      const spy = spyOf(actual)
      const count = spy.mock.calls.length
      return {
        pass: count > 0,
        message: (negated) =>
          negated
            ? `expected ${spyName(spy)} to not be called at all, but actually been called ${count} times`
            : `expected ${spyName(spy)} to be called at least once`,
      }
    }
    case 'toHaveBeenCalledTimes': {
      const spy = spyOf(actual)
      const count = spy.mock.calls.length
      return {
        pass: count === first,
        message: (negated) =>
          negated
            ? `expected ${spyName(spy)} to not be called ${String(first)} times`
            : `expected ${spyName(spy)} to be called ${String(first)} times, but got ${count} times`,
        expected: first,
        actual: count,
      }
    }
    case 'toHaveBeenCalledOnce': {
      const spy = spyOf(actual)
      const count = spy.mock.calls.length
      return {
        pass: count === 1,
        message: (negated) =>
          negated
            ? `expected ${spyName(spy)} to not be called once`
            : `expected ${spyName(spy)} to be called once, but got ${count} times`,
        expected: 1,
        actual: count,
      }
    }
    case 'toHaveBeenCalledWith': {
      const spy = spyOf(actual)
      return {
        pass: calledWith(spy, args),
        message: (negated) => `expected ${spyName(spy)} to ${not(negated)}be called with arguments: ${show(args)}`,
        expected: args,
        actual: spy.mock.calls,
      }
    }
    case 'toHaveBeenCalledExactlyOnceWith': {
      const spy = spyOf(actual)
      return {
        pass: spy.mock.calls.length === 1 && calledWith(spy, args),
        message: (negated) => `expected ${spyName(spy)} to ${not(negated)}be called once with arguments: ${show(args)}`,
        expected: args,
        actual: spy.mock.calls,
      }
    }
    case 'toHaveBeenLastCalledWith': {
      const spy = spyOf(actual)
      const last = spy.mock.lastCall
      return {
        pass: last !== undefined && equals(last, args),
        message: (negated) =>
          `expected last ${spyName(spy)} call to ${not(negated)}have been called with ${show(args)}`,
        expected: args,
        actual: last,
      }
    }
    case 'toHaveBeenNthCalledWith': {
      const spy = spyOf(actual)
      const nth = Number(first)
      const expected = args.slice(1)
      const call = spy.mock.calls[nth - 1]
      const count = spy.mock.calls.length
      return {
        pass: call !== undefined && equals(call, expected),
        message: (negated) =>
          `expected ${ordinal(nth)} ${spyName(spy)} call to ${not(negated)}have been called with ${show(expected)}` +
          (nth > count ? `, but called only ${count} times` : ''),
        expected,
        actual: call,
      }
    }
    case 'toHaveReturned': {
      const spy = spyOf(actual)
      return {
        pass: spy.mock.results.some((result) => result.type === 'return'),
        message: (negated) =>
          `expected ${spyName(spy)} to ${not(negated)}be successfully called${negated ? '' : ' at least once'}`,
      }
    }
    case 'toHaveReturnedWith': {
      const spy = spyOf(actual)
      return {
        pass: spy.mock.results.some((result) => result.type === 'return' && equals(result.value, first)),
        message: (negated) => `expected ${spyName(spy)} to ${not(negated)}return with: ${show(first)} at least once`,
        expected: first,
      }
    }
    default:
      throw new TypeError(`Unknown matcher ${String(name)}`)
  }
}

const MATCHER_NAMES: ReadonlyArray<keyof Matchers<void>> = [
  'toBe',
  'toEqual',
  'toStrictEqual',
  'toBeTruthy',
  'toBeFalsy',
  'toBeNull',
  'toBeUndefined',
  'toBeDefined',
  'toBeNaN',
  'toBeTypeOf',
  'toBeInstanceOf',
  'toContain',
  'toContainEqual',
  'toHaveLength',
  'toHaveProperty',
  'toMatch',
  'toMatchObject',
  'toThrow',
  'toThrowError',
  'toBeGreaterThan',
  'toBeGreaterThanOrEqual',
  'toBeLessThan',
  'toBeLessThanOrEqual',
  'toBeCloseTo',
  'toHaveBeenCalled',
  'toHaveBeenCalledTimes',
  'toHaveBeenCalledOnce',
  'toHaveBeenCalledWith',
  'toHaveBeenCalledExactlyOnceWith',
  'toHaveBeenLastCalledWith',
  'toHaveBeenNthCalledWith',
  'toHaveReturned',
  'toHaveReturnedWith',
]

const check = (
  name: keyof Matchers<void>,
  actual: unknown,
  mode: Mode,
  negated: boolean,
  args: ReadonlyArray<unknown>
) => {
  const outcome = outcomeOf(name, actual, mode, args)
  if (outcome.pass !== negated) return
  throw 'expected' in outcome && 'actual' in outcome
    ? new AssertionError(outcome.message(negated), outcome.expected, outcome.actual)
    : new AssertionError(outcome.message(negated))
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  typeof (value as { then?: unknown }).then === 'function'

const settle = (actual: unknown, mode: 'resolves' | 'rejects'): Promise<unknown> => {
  if (!isThenable(actual)) {
    return Promise.reject(
      new TypeError(`You must provide a Promise to expect() when using .${mode}, not '${typeof actual}'.`)
    )
  }
  return Promise.resolve(actual).then(
    (value) => {
      if (mode === 'rejects') throw new AssertionError(`promise resolved "${String(value)}" instead of rejecting`)
      return value
    },
    (reason: unknown) => {
      if (mode === 'resolves') throw new AssertionError(`promise rejected "${String(reason)}" instead of resolving`)
      return reason
    }
  )
}

const makeAssertion = (actual: unknown, negated: boolean): Assertion => {
  const assertion = {} as Record<string, unknown>
  for (const name of MATCHER_NAMES) {
    assertion[name] = (...args: Array<unknown>) => check(name, actual, 'value', negated, args)
  }
  Object.defineProperties(assertion, {
    not: { get: () => makeAssertion(actual, !negated) },
    resolves: { get: () => makePromisified(actual, 'resolves', false) },
    rejects: { get: () => makePromisified(actual, 'rejects', false) },
  })
  return assertion as unknown as Assertion
}

const makePromisified = (actual: unknown, mode: 'resolves' | 'rejects', negated: boolean): PromisifiedAssertion => {
  const assertion = {} as Record<string, unknown>
  for (const name of MATCHER_NAMES) {
    assertion[name] = (...args: Array<unknown>) =>
      settle(actual, mode).then((value) => check(name, value, mode, negated, args))
  }
  Object.defineProperty(assertion, 'not', { get: () => makePromisified(actual, mode, !negated) })
  return assertion as unknown as PromisifiedAssertion
}

export const expect: ExpectStatic = Object.assign(<T>(actual: T): Assertion<T> => makeAssertion(actual, false), {
  any,
  anything,
  arrayContaining,
  objectContaining,
  stringContaining,
  stringMatching,
})
