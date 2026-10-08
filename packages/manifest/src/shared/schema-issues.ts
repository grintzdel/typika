import * as SchemaIssue from 'effect/SchemaIssue'

export type FieldIssue =
  | { readonly kind: 'missing'; readonly path: string }
  | { readonly kind: 'unknown'; readonly path: string }
  | { readonly kind: 'invalid'; readonly path: string; readonly reason: string }

export const formatFieldPath = (path: ReadonlyArray<PropertyKey>): string =>
  path.reduce<string>((formatted, key) => {
    if (typeof key === 'number') return `${formatted}[${key}]`
    return formatted === '' ? String(key) : `${formatted}.${String(key)}`
  }, '')

const formatter = SchemaIssue.makeFormatterStandardSchemaV1()

const reasonOf = (issue: SchemaIssue.Issue): string => {
  const message = formatter(issue).issues[0]?.message ?? 'invalid value'
  return message.charAt(0).toLowerCase() + message.slice(1).replace(/\.$/, '')
}

export const fieldIssuesOf = (
  issue: SchemaIssue.Issue,
  path: ReadonlyArray<PropertyKey> = []
): ReadonlyArray<FieldIssue> => {
  switch (issue._tag) {
    case 'Pointer':
      return fieldIssuesOf(issue.issue, [...path, ...issue.path])
    case 'Encoding':
      return fieldIssuesOf(issue.issue, path)
    case 'Composite':
      return issue.issues.flatMap((child) => fieldIssuesOf(child, path))
    case 'UnexpectedKey':
      return [{ kind: 'unknown', path: formatFieldPath(path) }]
    case 'MissingKey': {
      const last = path.at(-1)
      if (typeof last === 'number') {
        return [{ kind: 'invalid', path: formatFieldPath(path.slice(0, -1)), reason: 'expected at least one element' }]
      }
      return [{ kind: 'missing', path: formatFieldPath(path) }]
    }
    default:
      return [{ kind: 'invalid', path: formatFieldPath(path), reason: reasonOf(issue) }]
  }
}
