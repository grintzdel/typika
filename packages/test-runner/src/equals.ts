import { isAsymmetricMatcher } from './asymmetric.ts'

const tagOf = (value: object) => Object.prototype.toString.call(value)

const ownKeys = (value: object, strict: boolean): Array<PropertyKey> => {
  const record = value as Record<PropertyKey, unknown>
  const keys: Array<PropertyKey> = [
    ...Object.keys(value),
    ...Object.getOwnPropertySymbols(value).filter((symbol) =>
      Object.prototype.propertyIsEnumerable.call(value, symbol)
    ),
  ]
  return strict ? keys : keys.filter((key) => record[key] !== undefined)
}

const iterableEquals = (a: object, b: object, strict: boolean, seen: Seen): boolean | undefined => {
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false
    const others = [...(b as Set<unknown>)]
    return [...(a as Set<unknown>)].every(
      (item) => b.has(item) || others.some((other) => deepEquals(item, other, strict, seen))
    )
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false
    const others = [...(b as Map<unknown, unknown>)]
    return [...(a as Map<unknown, unknown>)].every(
      ([key, item]) =>
        (b.has(key) && deepEquals(item, b.get(key), strict, seen)) ||
        others.some(
          ([otherKey, other]) => deepEquals(key, otherKey, strict, seen) && deepEquals(item, other, strict, seen)
        )
    )
  }
  return undefined
}

type Seen = { readonly a: Array<object>; readonly b: Array<object> }

const deepEquals = (a: unknown, b: unknown, strict: boolean, seen: Seen): boolean => {
  const aMatcher = isAsymmetricMatcher(a)
  const bMatcher = isAsymmetricMatcher(b)
  if (aMatcher && !bMatcher) return a.asymmetricMatch(b)
  if (bMatcher && !aMatcher) return b.asymmetricMatch(a)
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

  const tag = tagOf(a)
  if (tag !== tagOf(b)) return false
  if (a instanceof Date && b instanceof Date) return Object.is(a.getTime(), b.getTime())
  if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags
  if (tag === '[object Number]') return Object.is(Number.prototype.valueOf.call(a), Number.prototype.valueOf.call(b))
  if (tag === '[object String]') return String.prototype.valueOf.call(a) === String.prototype.valueOf.call(b)
  if (tag === '[object Boolean]') return Boolean.prototype.valueOf.call(a) === Boolean.prototype.valueOf.call(b)
  if (a instanceof Error && b instanceof Error) {
    if (a.name !== b.name || a.message !== b.message) return false
    if (!deepEquals(a.cause, b.cause, strict, seen)) return false
  }

  const index = seen.a.indexOf(a)
  if (index !== -1) return seen.b[index] === b
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false

  seen.a.push(a)
  seen.b.push(b)
  try {
    const iterable = iterableEquals(a, b, strict, seen)
    if (iterable !== undefined) return iterable
    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
      const left = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
      const right = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
      return left.length === right.length && left.every((byte, i) => byte === right[i])
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i += 1) {
        if (strict && i in a !== i in b) return false
        if (!deepEquals(a[i], b[i], strict, seen)) return false
      }
    }
    const aRecord = a as Record<PropertyKey, unknown>
    const bRecord = b as Record<PropertyKey, unknown>
    const aKeys = ownKeys(a, strict).filter((key) => !Array.isArray(a) || typeof key !== 'string' || !/^\d+$/.test(key))
    const bKeys = ownKeys(b, strict).filter((key) => !Array.isArray(b) || typeof key !== 'string' || !/^\d+$/.test(key))
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEquals(aRecord[key], bRecord[key], strict, seen)
    )
  } finally {
    seen.a.pop()
    seen.b.pop()
  }
}

export const equals = (a: unknown, b: unknown, strict = false): boolean => deepEquals(a, b, strict, { a: [], b: [] })

export const subsetEquals = (object: unknown, subset: unknown, seen: Array<unknown> = []): boolean => {
  if (isAsymmetricMatcher(subset)) return subset.asymmetricMatch(object)
  if (typeof subset !== 'object' || subset === null || typeof object !== 'object' || object === null) {
    return equals(object, subset)
  }
  if (Array.isArray(subset)) {
    return (
      Array.isArray(object) &&
      object.length === subset.length &&
      subset.every((item: unknown, i) => subsetEquals(object[i], item, seen))
    )
  }
  if (subset instanceof Date || subset instanceof RegExp || subset instanceof Map || subset instanceof Set) {
    return equals(object, subset)
  }
  if (seen.includes(subset)) return true
  const objectRecord = object as Record<PropertyKey, unknown>
  const subsetRecord = subset as Record<PropertyKey, unknown>
  return ownKeys(subset, true).every(
    (key) => key in object && subsetEquals(objectRecord[key], subsetRecord[key], [...seen, subset])
  )
}
