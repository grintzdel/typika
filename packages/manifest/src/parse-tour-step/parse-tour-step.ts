import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { parse } from 'smol-toml'

import { ManifestIssueCode } from '../domain/constants/issue-code.constant.ts'
import { ManifestInvalidError } from '../domain/errors/manifest-invalid.error.ts'
import { makeIssue } from '../domain/manifest-issue.domain-model.ts'
import { parseLineRange, TourStepFrontMatterSchema, type TourStep } from '../domain/tour-step.domain-model.ts'
import { fieldIssuesOf, type FieldIssue } from '../shared/schema-issues.ts'

const FRONT_MATTER = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+(?:\r?\n|$)/

const reasonOf = (issue: FieldIssue): string => {
  if (issue.kind === 'missing') return `missing field "${issue.path}"`
  if (issue.kind === 'unknown') return `unknown field "${issue.path}"`
  return `invalid value for "${issue.path}": ${issue.reason}`
}

const anchorReasons = (frontMatter: Readonly<Record<string, unknown>>): ReadonlyArray<string> => [
  ...('lines' in frontMatter && !('file' in frontMatter) ? ['"lines" requires "file"'] : []),
  ...('region' in frontMatter && !('file' in frontMatter) ? ['"region" requires "file"'] : []),
  ...('lines' in frontMatter && 'region' in frontMatter ? ['"lines" and "region" are exclusive'] : []),
]

const fail = (path: string, reasons: ReadonlyArray<string>) =>
  new ManifestInvalidError({
    issues: reasons.map((reason) =>
      makeIssue(ManifestIssueCode.TOUR_FRONTMATTER, path, `Tour step "${path}": ${reason}.`)
    ),
  })

export const parseTourStep = (path: string, source: string): Effect.Effect<TourStep, ManifestInvalidError> =>
  Effect.gen(function* () {
    const match = FRONT_MATTER.exec(source)
    if (match === null) return yield* fail(path, ['missing front-matter delimited by +++'])

    const frontMatter = yield* Effect.try({
      try: () => parse(match[1] ?? ''),
      catch: (error) =>
        fail(path, [`invalid TOML: ${error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)}`]),
    })

    const decoded = Schema.decodeUnknownExit(TourStepFrontMatterSchema)(frontMatter, {
      onExcessProperty: 'error',
      errors: 'all',
    })
    const reasons = [
      ...(Exit.isFailure(decoded)
        ? Option.match(Exit.findErrorOption(decoded), {
            onNone: () => [],
            onSome: (error) => fieldIssuesOf(error.issue).map(reasonOf),
          })
        : []),
      ...anchorReasons(frontMatter),
    ]
    if (reasons.length > 0 || Exit.isFailure(decoded)) return yield* fail(path, reasons)

    const { lines, also, ...step } = decoded.value
    const range = lines === undefined ? undefined : parseLineRange(lines)
    return {
      path,
      ...step,
      ...(range === undefined ? {} : { lines: range }),
      also: also ?? [],
      body: source.slice(match[0].length).replace(/^\r?\n/, ''),
    }
  })
