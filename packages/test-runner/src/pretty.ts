import { isAsymmetricMatcher } from './asymmetric.ts'

const INDENT = '  '

const classPrefix = (value: object): string => {
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype === null) return 'Object '
  if (prototype === Object.prototype || prototype === Array.prototype) return ''
  const name = (value as { constructor?: { name?: unknown } }).constructor?.name
  return typeof name === 'string' && name !== '' ? `${name} ` : ''
}

const printKey = (key: PropertyKey) => (typeof key === 'symbol' ? key.toString() : JSON.stringify(key))

const block = (open: string, lines: ReadonlyArray<string>, close: string, indent: string) =>
  lines.length === 0
    ? `${open}${close}`
    : `${open}\n${lines.map((line) => `${indent}${INDENT}${line},\n`).join('')}${indent}${close}`

const print = (value: unknown, indent: string, seen: Array<unknown>): string => {
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value)
    case 'bigint':
      return `${value}n`
    case 'boolean':
    case 'undefined':
      return String(value)
    case 'symbol':
      return value.toString()
    case 'function':
      return `[Function ${value.name || 'anonymous'}]`
    case 'object':
      break
  }
  if (value === null) return 'null'
  if (isAsymmetricMatcher(value)) return value.toAsymmetricMatcher()
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'Date { NaN }' : value.toISOString()
  if (value instanceof RegExp) return String(value)
  if (value instanceof Error) return `[${value.name}: ${value.message}]`
  if (seen.includes(value)) return '[Circular]'
  const nested = [...seen, value]
  const inner = indent + INDENT
  if (Array.isArray(value)) {
    return block(
      `${classPrefix(value)}[`,
      value.map((item) => print(item, inner, nested)),
      ']',
      indent
    )
  }
  if (value instanceof Map) {
    return block(
      'Map {',
      [...(value as Map<unknown, unknown>)].map(
        ([key, item]) => `${print(key, inner, nested)} => ${print(item, inner, nested)}`
      ),
      '}',
      indent
    )
  }
  if (value instanceof Set) {
    return block(
      'Set {',
      [...(value as Set<unknown>)].map((item) => print(item, inner, nested)),
      '}',
      indent
    )
  }
  const record = value as Record<PropertyKey, unknown>
  const keys: Array<PropertyKey> = [
    ...Object.keys(value).toSorted(),
    ...Object.getOwnPropertySymbols(value).filter((symbol) =>
      Object.prototype.propertyIsEnumerable.call(value, symbol)
    ),
  ]
  return block(
    `${classPrefix(value)}{`,
    keys.map((key) => `${printKey(key)}: ${print(record[key], inner, nested)}`),
    '}',
    indent
  )
}

export const pretty = (value: unknown): string => print(value, '', [])

const printCompact = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(printCompact).join(', ')}]`
  if (typeof value === 'object' && value !== null && !(value instanceof Date) && !(value instanceof RegExp)) {
    if (isAsymmetricMatcher(value)) return value.toAsymmetricMatcher()
    const record = value as Record<string, unknown>
    return `{${Object.keys(value)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}: ${printCompact(record[key])}`)
      .join(', ')}}`
  }
  return print(value, '', [])
}

export const prettyCompact = (value: unknown): string => printCompact(value)
