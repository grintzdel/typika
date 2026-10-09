import { inspect } from './inspect.ts'

const ESCAPED_PERCENT = '__typika_escaped_%__'
const ATTRIBUTE = /\$([$\w.]+)/g
const PLACEHOLDER = /%[sdifjoOc%]/g
const OBJECT_DISPLAY_LIMIT = 40

const isPlainObjectItem = (value: unknown): value is object =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const formatNumber = (value: number) => (Object.is(value, -0) ? '-0' : String(value))

const formatString = (value: unknown): string => {
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'object' && value !== null) {
    const toString = (value as { toString?: unknown }).toString
    if (typeof toString === 'function' && toString !== Object.prototype.toString) {
      return String((toString as (this: object) => unknown).call(value))
    }
    return inspect(value, { truncate: 0, spacedClassName: true })
  }
  return String(value)
}

const formatJson = (value: unknown) => {
  try {
    const json: string | undefined = JSON.stringify(value)
    return json ?? 'undefined'
  } catch {
    return '[Circular]'
  }
}

export const format = (template: string, args: ReadonlyArray<unknown>): string => {
  let index = 0
  const next = () => {
    const value = args[index]
    index += 1
    return value
  }
  const output = template.replace(PLACEHOLDER, (token) => {
    if (token === '%%') return '%'
    if (index >= args.length) return token
    const value = next()
    switch (token) {
      case '%s':
        return formatString(value)
      case '%d':
        return typeof value === 'bigint' ? `${value}n` : formatNumber(Number(value))
      case '%i':
        return typeof value === 'bigint' ? `${value}n` : formatNumber(Number.parseInt(String(value), 10))
      case '%f':
        return formatNumber(Number.parseFloat(String(value)))
      case '%j':
        return formatJson(value)
      case '%c':
        return ''
      default:
        return inspect(value, { truncate: 0, spacedClassName: true })
    }
  })
  const rest = args
    .slice(index)
    .map((value) =>
      value === null || typeof value !== 'object'
        ? String(value)
        : inspect(value, { truncate: 0, spacedClassName: true })
    )
  return [output, ...rest].join(' ')
}

const objectDisplay = (value: unknown): string => {
  if (typeof value === 'string') return value
  const text = inspect(value, { truncate: OBJECT_DISPLAY_LIMIT })
  if (text.length < OBJECT_DISPLAY_LIMIT) return text
  if (typeof value === 'function') return value.name ? `[Function: ${value.name}]` : '[Function]'
  if (Array.isArray(value)) return `[ Array(${value.length}) ]`
  if (isPlainObjectItem(value) && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value)
    return `{ Object (${keys.length > 2 ? `${keys.slice(0, 2).join(', ')}, ...` : keys.join(', ')}) }`
  }
  return text
}

const attributeOf = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined
    return (current as Record<string, unknown>)[key]
  }, source)

export const formatEachName = (template: string, items: ReadonlyArray<unknown>, index: number): string => {
  let formatted = template
  if (template.includes('%#') || template.includes('%$')) {
    formatted = formatted
      .replaceAll('%%', ESCAPED_PERCENT)
      .replaceAll('%#', String(index))
      .replaceAll('%$', String(index + 1))
      .replaceAll(ESCAPED_PERCENT, '%%')
  }
  const count = formatted.split('%').length - 1
  const objectItem = isPlainObjectItem(items[0])
  return format(formatted, items.slice(0, count)).replace(ATTRIBUTE, (match, key: string) => {
    const arrayKey = /^\d+$/.test(key)
    if (!objectItem && !arrayKey) return match
    const value = objectItem ? attributeOf(items[0], key) : items[Number(key)]
    return objectDisplay(value)
  })
}
