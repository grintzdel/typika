import { equals } from './equals.ts'
import { CUSTOM_INSPECT } from './inspect.ts'
import { prettyCompact } from './pretty.ts'

const ASYMMETRIC = Symbol.for('typika.asymmetricMatcher')

export interface AsymmetricMatcher {
  readonly [ASYMMETRIC]: true
  readonly asymmetricMatch: (other: unknown) => boolean
  readonly toAsymmetricMatcher: () => string
}

export const isAsymmetricMatcher = (value: unknown): value is AsymmetricMatcher =>
  typeof value === 'object' && value !== null && ASYMMETRIC in value

const matcher = (asymmetricMatch: (other: unknown) => boolean, describe: () => string): AsymmetricMatcher => {
  const value = {
    [ASYMMETRIC]: true,
    asymmetricMatch,
    toAsymmetricMatcher: describe,
    [CUSTOM_INSPECT]: describe,
  } as const
  return value
}

type Constructor = abstract new (...args: never[]) => unknown

const matchesType = (type: Constructor | ((...args: never[]) => unknown), other: unknown): boolean => {
  if (type === String) return typeof other === 'string'
  if (type === Number) return typeof other === 'number'
  if (type === Boolean) return typeof other === 'boolean'
  if (type === BigInt) return typeof other === 'bigint'
  if (type === Symbol) return typeof other === 'symbol'
  if (type === Function) return typeof other === 'function'
  if (type === Object) return typeof other === 'object' && other !== null
  return other instanceof (type as Constructor)
}

export const any = (type: Constructor | ((...args: never[]) => unknown)): AsymmetricMatcher =>
  matcher(
    (other) => matchesType(type, other),
    () => `Any<${type.name}>`
  )

export const anything = (): AsymmetricMatcher =>
  matcher(
    (other) => other !== null && other !== undefined,
    () => 'Anything'
  )

export const objectContaining = (sample: Readonly<Record<PropertyKey, unknown>>): AsymmetricMatcher =>
  matcher(
    (other) =>
      typeof other === 'object' &&
      other !== null &&
      Reflect.ownKeys(sample).every(
        (key) => key in other && equals((other as Record<PropertyKey, unknown>)[key], sample[key])
      ),
    () => `ObjectContaining ${prettyCompact(sample)}`
  )

export const arrayContaining = (sample: ReadonlyArray<unknown>): AsymmetricMatcher =>
  matcher(
    (other) => Array.isArray(other) && sample.every((item) => other.some((candidate) => equals(candidate, item))),
    () => `ArrayContaining ${prettyCompact(sample)}`
  )

export const stringContaining = (expected: string): AsymmetricMatcher =>
  matcher(
    (other) => typeof other === 'string' && other.includes(expected),
    () => `StringContaining ${JSON.stringify(expected)}`
  )

export const stringMatching = (expected: string | RegExp): AsymmetricMatcher => {
  const pattern = typeof expected === 'string' ? new RegExp(expected) : expected
  return matcher(
    (other) => typeof other === 'string' && pattern.test(other),
    () => `StringMatching ${String(pattern)}`
  )
}
