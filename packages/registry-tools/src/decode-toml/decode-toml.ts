import { fieldIssuesOf, makeIssue, ManifestInvalidError, ManifestIssueCode, type FieldIssue } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { parse, TomlDate, TomlError } from 'smol-toml'

export const parseToml = (file: string, source: string): Effect.Effect<Record<string, unknown>, ManifestInvalidError> =>
  Effect.try({
    try: () => parse(source),
    catch: (error) => {
      const detail = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)
      const line = error instanceof TomlError ? error.line : 1
      return new ManifestInvalidError({
        issues: [
          makeIssue(
            ManifestIssueCode.TOML_PARSE,
            file,
            `${file} is not valid TOML: ${detail.replace(/^Invalid TOML document: /, '')} (line ${line})`
          ),
        ],
      })
    },
  })

const issueOfField = (issue: FieldIssue) => {
  if (issue.kind === 'missing') {
    return makeIssue(ManifestIssueCode.MISSING_FIELD, issue.path, `Missing required field "${issue.path}".`)
  }
  if (issue.kind === 'unknown') {
    return makeIssue(ManifestIssueCode.UNKNOWN_FIELD, issue.path, `Unknown field "${issue.path}".`)
  }
  return makeIssue(ManifestIssueCode.INVALID_VALUE, issue.path, `Invalid value for "${issue.path}": ${issue.reason}.`)
}

const withDates = (table: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(table).map(([key, value]) => [key, value instanceof TomlDate ? value.toISOString() : value])
  )

export const decodeToml = <S extends Schema.Decoder<unknown>>(schema: S, file: string, source: string) =>
  Effect.gen(function* () {
    const table = yield* parseToml(file, source)
    const decoded = Schema.decodeUnknownExit(schema)(withDates(table), { onExcessProperty: 'error', errors: 'all' })
    if (Exit.isSuccess(decoded)) return decoded.value
    const issues = Option.match(Exit.findErrorOption(decoded), {
      onNone: () => [],
      onSome: (error) => fieldIssuesOf(error.issue).map(issueOfField),
    })
    return yield* new ManifestInvalidError({ issues })
  })
