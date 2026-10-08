import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { parse, TomlError } from 'smol-toml'
import spdxLicenseIds from 'spdx-license-ids/index.json' with { type: 'json' }

import { ManifestIssueCode } from '../domain/constants/issue-code.constant.ts'
import {
  RUNTIME_OF_LANGUAGE,
  TEST_RUNNER_OF_RUNTIME,
  type Language,
  type RuntimeKind,
} from '../domain/constants/language.constant.ts'
import { ManifestInvalidError } from '../domain/errors/manifest-invalid.error.ts'
import { makeIssue, type ManifestIssue } from '../domain/manifest-issue.domain-model.ts'
import { ManifestSchema, SUPPORTED_SCHEMA_VERSIONS, type Manifest } from '../domain/manifest.domain-model.ts'
import { parseTemplateRef } from '../parse-template-ref/parse-template-ref.ts'
import { fieldIssuesOf, type FieldIssue } from '../shared/schema-issues.ts'

type Table = Readonly<Record<string, unknown>>

const SPDX_LICENSE_IDS: ReadonlySet<string> = new Set(spdxLicenseIds)
const BASE_FORBIDDEN_FIELDS = ['base', 'variants', 'tour'] as const

const isTable = (value: unknown): value is Table =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)

const tableAt = (table: Table, key: string): Table => {
  const value = table[key]
  return isTable(value) ? value : {}
}

const stringAt = (table: Table, key: string): string | undefined => {
  const value = table[key]
  return typeof value === 'string' ? value : undefined
}

const issueOfField = (issue: FieldIssue): ManifestIssue => {
  if (issue.kind === 'missing') {
    return makeIssue(ManifestIssueCode.MISSING_FIELD, issue.path, `Missing required field "${issue.path}".`)
  }
  if (issue.kind === 'unknown') {
    return makeIssue(
      ManifestIssueCode.UNKNOWN_FIELD,
      issue.path,
      `Unknown field "${issue.path}". Extensions must live under [x-*].`
    )
  }
  return invalidValue(issue.path, issue.reason)
}

const invalidValue = (path: string, reason: string) =>
  makeIssue(ManifestIssueCode.INVALID_VALUE, path, `Invalid value for "${path}": ${reason}.`)

const firstPerField = (issues: ReadonlyArray<ManifestIssue>): ReadonlyArray<ManifestIssue> => {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.code} ${issue.path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const parseToml = (source: string): Effect.Effect<Table, ManifestInvalidError> =>
  Effect.try({
    try: () => parse(source),
    catch: (error) => {
      const detail = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)
      const line = error instanceof TomlError ? error.line : 1
      return new ManifestInvalidError({
        issues: [
          makeIssue(
            ManifestIssueCode.TOML_PARSE,
            'typika.toml',
            `typika.toml is not valid TOML: ${detail.replace(/^Invalid TOML document: /, '')} (line ${line})`
          ),
        ],
      })
    },
  })

const checkSchemaVersion = (table: Table): ReadonlyArray<ManifestIssue> => {
  if (!('schema' in table)) return []
  const found = table['schema']
  if (SUPPORTED_SCHEMA_VERSIONS.some((version) => version === found)) return []
  return [
    makeIssue(
      ManifestIssueCode.SCHEMA_VERSION_UNSUPPORTED,
      'schema',
      `Manifest schema ${String(found)} is not supported. Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`
    ),
  ]
}

const splitExtensions = (table: Table) => {
  const extensions: Record<string, Table> = {}
  const fields: Record<string, unknown> = {}
  const issues: Array<ManifestIssue> = []
  for (const [key, value] of Object.entries(table)) {
    if (!key.startsWith('x-')) fields[key] = value
    else if (isTable(value)) extensions[key] = value
    else issues.push(invalidValue(key, 'expected a table'))
  }
  return { extensions, fields, issues }
}

const checkLicense = (table: Table): ReadonlyArray<ManifestIssue> => {
  const license = stringAt(table, 'license')
  if (license === undefined || SPDX_LICENSE_IDS.has(license)) return []
  return [
    makeIssue(ManifestIssueCode.LICENSE_INVALID, 'license', `"${license}" is not a valid SPDX license identifier.`),
  ]
}

const checkRefs = (table: Table): ReadonlyArray<ManifestIssue> => {
  const refs: Array<readonly [string, string | undefined]> = [
    ['parent', stringAt(table, 'parent')],
    ['base.template', stringAt(tableAt(table, 'base'), 'template')],
    ...Object.keys(tableAt(table, 'variants')).map(
      (key) => [`variants.${key}`, stringAt(tableAt(table, 'variants'), key)] as const
    ),
  ]
  return refs.flatMap(([path, ref]) =>
    ref === undefined || Option.isSome(parseTemplateRef(ref))
      ? []
      : [
          makeIssue(
            ManifestIssueCode.INVALID_REF,
            path,
            `"${ref}" is not a valid template reference (expected github:<owner>/<repo>[/<path>][@<ref>]).`
          ),
        ]
  )
}

const isRuntimeKind = (value: string | undefined): value is RuntimeKind =>
  value !== undefined && Object.hasOwn(TEST_RUNNER_OF_RUNTIME, value)

const isLanguage = (value: string | undefined): value is Language =>
  value !== undefined && Object.hasOwn(RUNTIME_OF_LANGUAGE, value)

const checkRuntime = (table: Table): ReadonlyArray<ManifestIssue> => {
  const language = stringAt(tableAt(table, 'facets'), 'language')
  const kind = stringAt(tableAt(table, 'runtime'), 'kind')
  const test = stringAt(tableAt(table, 'commands'), 'test')
  const issues: Array<ManifestIssue> = []
  if (isLanguage(language) && isRuntimeKind(kind)) {
    if (RUNTIME_OF_LANGUAGE[language] !== kind) {
      issues.push(
        makeIssue(
          ManifestIssueCode.RUNTIME_LANGUAGE_MISMATCH,
          'runtime.kind',
          `Runtime "${kind}" cannot run language "${language}".`
        )
      )
    }
  }
  const knownRunners: ReadonlyArray<string> = Object.values(TEST_RUNNER_OF_RUNTIME)
  if (
    isRuntimeKind(kind) &&
    test !== undefined &&
    knownRunners.includes(test) &&
    TEST_RUNNER_OF_RUNTIME[kind] !== test
  ) {
    issues.push(invalidValue('commands.test', `expected "${TEST_RUNNER_OF_RUNTIME[kind]}" for runtime "${kind}"`))
  }
  return issues
}

const checkVariants = (table: Table): ReadonlyArray<ManifestIssue> => {
  const language = stringAt(tableAt(table, 'facets'), 'language')
  if (language === undefined || !(language in tableAt(table, 'variants'))) return []
  return [
    makeIssue(
      ManifestIssueCode.VARIANT_SELF,
      `variants.${language}`,
      `A template cannot declare a variant in its own language ("${language}").`
    ),
  ]
}

const checkExercises = (table: Table): ReadonlyArray<ManifestIssue> => {
  const exercises = Array.isArray(table['exercises']) ? (table['exercises'] as ReadonlyArray<unknown>) : []
  const names = new Set<string>()
  return exercises.flatMap((exercise, index) => {
    if (!isTable(exercise)) return []
    const issues: Array<ManifestIssue> = []
    const name = stringAt(exercise, 'name') ?? ''
    if (names.has(name)) {
      issues.push(
        makeIssue(
          ManifestIssueCode.EXERCISE_DUPLICATE_NAME,
          `exercises[${index}].name`,
          `Exercise name "${name}" is used more than once.`
        )
      )
    }
    names.add(name)
    const from = stringAt(exercise, 'from') ?? 'self'
    if (from === 'base' && !('base' in table)) {
      issues.push(
        makeIssue(
          ManifestIssueCode.EXERCISE_FROM_BASE_WITHOUT_BASE,
          `exercises[${index}].from`,
          `Exercise "${name}" starts from base but the template has no [base].`
        )
      )
    }
    if (stringAt(exercise, 'solutionFrom') === 'self' && from !== 'base') {
      issues.push(
        makeIssue(
          ManifestIssueCode.EXERCISE_SOLUTION_FROM_SELF,
          `exercises[${index}].solutionFrom`,
          `Exercise "${name}": solutionFrom = "self" requires from = "base".`
        )
      )
    }
    return issues
  })
}

const checkBaseRole = (table: Table): ReadonlyArray<ManifestIssue> =>
  table['role'] !== 'base'
    ? []
    : BASE_FORBIDDEN_FIELDS.filter((field) => field in table).map((field) =>
        makeIssue(ManifestIssueCode.BASE_FORBIDDEN_FIELD, field, `A base template cannot declare [${field}].`)
      )

export const parseManifest = (source: string): Effect.Effect<Manifest, ManifestInvalidError> =>
  Effect.gen(function* () {
    const table = yield* parseToml(source)
    const versionIssues = checkSchemaVersion(table)
    if (versionIssues.length > 0) return yield* new ManifestInvalidError({ issues: versionIssues })

    const { extensions, fields, issues: extensionIssues } = splitExtensions(table)
    const decoded = Schema.decodeUnknownExit(ManifestSchema)(fields, { onExcessProperty: 'error', errors: 'all' })
    const schemaIssues = Exit.isFailure(decoded)
      ? Option.match(Exit.findErrorOption(decoded), {
          onNone: () => [],
          onSome: (error) => fieldIssuesOf(error.issue).map(issueOfField),
        })
      : []
    const issues = firstPerField([
      ...extensionIssues,
      ...schemaIssues,
      ...checkLicense(fields),
      ...checkRefs(fields),
      ...checkRuntime(fields),
      ...checkVariants(fields),
      ...checkExercises(fields),
      ...checkBaseRole(fields),
    ])

    if (issues.length > 0 || Exit.isFailure(decoded)) return yield* new ManifestInvalidError({ issues })
    return { ...decoded.value, extensions }
  })
