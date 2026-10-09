const TRUNCATOR = '…'
const DEFAULT_TRUNCATE = 40
const PLAIN_KEY = /^[a-z_]\w*$/i

const ESCAPES: Readonly<Record<string, string>> = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  "'": "\\'",
  '\\': '\\\\',
}
const ERROR_KEYS = new Set([
  'stack',
  'line',
  'column',
  'name',
  'message',
  'fileName',
  'lineNumber',
  'columnNumber',
  'number',
  'description',
  'cause',
])

export const CUSTOM_INSPECT = Symbol.for('chai/inspect')

type Options = {
  truncate: number
  seen: Array<unknown>
  readonly spacedClassName: boolean
}

const needsEscape = (char: string) => {
  const code = char.charCodeAt(0)
  return (
    char === "'" || char === '\\' || code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029
  )
}

const escapeChar = (char: string) =>
  ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`

export const truncate = (input: string, length: number, tail = TRUNCATOR): string => {
  if (tail.length > length && input.length > tail.length) return tail
  if (input.length > length && input.length > tail.length) {
    let end = length - tail.length
    const code = input.charCodeAt(end - 1)
    if (end > 0 && code >= 0xd800 && code <= 0xdbff) end -= 1
    return `${input.slice(0, end)}${tail}`
  }
  return input
}

const inspectList = <T>(
  list: ReadonlyArray<T>,
  options: Options,
  inspectItem: (item: T, options: Options) => string,
  separator = ', '
): string => {
  const size = list.length
  if (size === 0) return ''
  const originalLength = options.truncate
  let output = ''
  let peek = ''
  let truncated = ''
  for (let i = 0; i < size; i += 1) {
    const last = i + 1 === size
    const secondToLast = i + 2 === size
    truncated = `${TRUNCATOR}(${size - i})`
    const value = list[i] as T
    options.truncate = originalLength - output.length - (last ? 0 : separator.length)
    const item = peek || inspectItem(value, options) + (last ? '' : separator)
    const nextLength = output.length + item.length
    const truncatedLength = nextLength + truncated.length
    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) break
    if (!last && !secondToLast && truncatedLength > originalLength) break
    peek = last ? '' : inspectItem(list[i + 1] as T, options) + (secondToLast ? '' : separator)
    if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) break
    output += item
    if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
      truncated = `${TRUNCATOR}(${size - i - 1})`
      break
    }
    truncated = ''
  }
  return `${output}${truncated}`
}

const inspectString = (value: string, options: Options) =>
  `'${truncate(Array.from(value, (char) => (needsEscape(char) ? escapeChar(char) : char)).join(''), options.truncate - 2)}'`

const inspectNumber = (value: number, options: Options) => {
  if (Number.isNaN(value)) return 'NaN'
  if (value === Infinity) return 'Infinity'
  if (value === -Infinity) return '-Infinity'
  if (value === 0) return Object.is(value, -0) ? '-0' : '+0'
  return truncate(String(value), options.truncate)
}

const inspectProperty = ([key, value]: readonly [PropertyKey, unknown], options: Options) => {
  options.truncate -= 2
  let label: string
  if (typeof key === 'string') label = PLAIN_KEY.test(key) ? key : inspectString(key, options)
  else if (typeof key === 'number') label = String(key)
  else label = `[${inspectValue(key, options)}]`
  options.truncate -= label.length
  return `${label}: ${inspectValue(value, options)}`
}

const withSeen = (value: object, options: Options, render: () => string) => {
  if (options.seen.includes(value)) return '[Circular]'
  options.seen.push(value)
  const output = render()
  options.seen.pop()
  return output
}

const inspectPlainObject = (value: object, options: Options) => {
  const record = value as Record<PropertyKey, unknown>
  const keys = Object.keys(value)
  const symbols = Object.getOwnPropertySymbols(value).filter((symbol) =>
    Object.prototype.propertyIsEnumerable.call(value, symbol)
  )
  if (keys.length === 0 && symbols.length === 0) return '{}'
  options.truncate -= 4
  return withSeen(value, options, () => {
    const properties = inspectList(
      keys.map((key) => [key, record[key]] as const),
      options,
      inspectProperty
    )
    const symbolProperties = inspectList(
      symbols.map((symbol) => [symbol, record[symbol]] as const),
      options,
      inspectProperty
    )
    return `{ ${properties}${properties && symbolProperties ? ', ' : ''}${symbolProperties} }`
  })
}

const inspectArray = (value: ReadonlyArray<unknown>, options: Options) => {
  const extraKeys = Object.keys(value).slice(value.length)
  if (value.length === 0 && extraKeys.length === 0) return '[]'
  options.truncate -= 4
  return withSeen(value, options, () => {
    const items = inspectList(value, options, inspectValue)
    options.truncate -= items.length
    const record = value as unknown as Record<string, unknown>
    const extra = inspectList(
      extraKeys.map((key) => [key, record[key]] as const),
      options,
      inspectProperty
    )
    return `[ ${items}${extra ? `, ${extra}` : ''} ]`
  })
}

const inspectError = (error: Error, options: Options) => {
  const record = error as unknown as Record<string, unknown>
  const properties = Object.getOwnPropertyNames(error).filter((key) => !ERROR_KEYS.has(key))
  const name = error.name
  options.truncate -= name.length
  const message = error.message ? `: ${truncate(error.message, options.truncate)}` : ''
  options.truncate -= message.length + 5
  return withSeen(error, options, () => {
    const contents = inspectList(
      properties.map((key) => [key, record[key]] as const),
      options,
      inspectProperty
    )
    return `${name}${message}${contents ? ` { ${contents} }` : ''}`
  })
}

const classNameOf = (value: object): string | undefined => {
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype === null || prototype === Object.prototype) return undefined
  const tag = (value as { [Symbol.toStringTag]?: unknown })[Symbol.toStringTag]
  if (typeof tag === 'string') return tag
  const constructor = (value as { constructor?: { name?: unknown } }).constructor
  return typeof constructor?.name === 'string' && constructor.name !== '' ? constructor.name : undefined
}

const inspectObject = (value: object, options: Options): string => {
  const custom = (value as { [CUSTOM_INSPECT]?: unknown })[CUSTOM_INSPECT]
  if (typeof custom === 'function') return String((custom as (this: object) => unknown).call(value))
  if (Array.isArray(value)) return inspectArray(value, options)
  if (value instanceof Error) return inspectError(value, options)
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return 'Invalid Date'
    const [date = '', time = ''] = value.toJSON().split('T')
    return `${date}T${truncate(time, options.truncate - date.length - 1)}`
  }
  if (value instanceof RegExp) {
    const flags = value.flags
    return `/${truncate(value.source, options.truncate - flags.length - 2)}/${flags}`
  }
  if (value instanceof Map) {
    if (value.size === 0) return 'Map{}'
    options.truncate -= 7
    return withSeen(value, options, () => {
      const entries = inspectList([...(value as Map<unknown, unknown>).entries()], options, ([key, item], opts) => {
        opts.truncate -= 4
        const keyText = inspectValue(key, opts)
        opts.truncate -= keyText.length
        return `${keyText} => ${inspectValue(item, opts)}`
      })
      return `Map{ ${entries} }`
    })
  }
  if (value instanceof Set) {
    if (value.size === 0) return 'Set{}'
    options.truncate -= 7
    return withSeen(value, options, () => `Set{ ${inspectList([...(value as Set<unknown>)], options, inspectValue)} }`)
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const name = classNameOf(value) ?? 'TypedArray'
    const items = [...(value as unknown as Iterable<number | bigint>)]
    if (items.length === 0) return `${name}[]`
    options.truncate -= name.length + 4
    return `${name}[ ${inspectList(items, options, inspectValue)} ]`
  }
  if (value instanceof Promise) return 'Promise{…}'
  const name = classNameOf(value)
  if (name === undefined) return inspectPlainObject(value, options)
  options.truncate -= name.length
  return `${name}${options.spacedClassName ? ' ' : ''}${inspectPlainObject(value, options)}`
}

const inspectValue = (value: unknown, options: Options): string => {
  if (value === null) return 'null'
  if (typeof value === 'object') return inspectObject(value, options)
  switch (typeof value) {
    case 'string':
      return inspectString(value, options)
    case 'number':
      return inspectNumber(value, options)
    case 'bigint':
      return `${truncate(value.toString(), options.truncate - 1)}n`
    case 'boolean':
      return String(value)
    case 'symbol':
      return value.toString()
    case 'function':
      return value.name ? `[Function ${truncate(value.name, options.truncate - 11)}]` : '[Function]'
    default:
      return 'undefined'
  }
}

export const inspect = (
  value: unknown,
  { truncate: limit = DEFAULT_TRUNCATE, spacedClassName = false }: { truncate?: number; spacedClassName?: boolean } = {}
): string => inspectValue(value, { truncate: limit === 0 ? Infinity : limit, seen: [], spacedClassName })
