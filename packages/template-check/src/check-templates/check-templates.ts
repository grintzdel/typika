import {
  makeIssue,
  ManifestIssueCode,
  validateTemplate,
  type RuntimeKind,
  type Manifest,
  type ManifestIssue,
  type TemplateFiles,
} from '@typika/manifest'
import * as Effect from 'effect/Effect'

import { checkExercises, type RunTests } from '../check-exercises/check-exercises.ts'
import { checkRefs } from '../check-refs/check-refs.ts'

export type TemplateSet = ReadonlyMap<string, TemplateFiles>

export type TemplateRunner = {
  readonly runTests: RunTests
  readonly checkFiles?: (files: TemplateFiles) => ReadonlyArray<ManifestIssue>
}

export type TemplateRunners = Partial<Readonly<Record<RuntimeKind, TemplateRunner>>>

export type TemplateCheck = {
  readonly dir: string
  readonly name: string | undefined
  readonly issues: ReadonlyArray<ManifestIssue>
  readonly exercisesRun: boolean
}

const OFFICIAL_PREFIX = 'github:typika/templates/'

export const officialRefOf = (dir: string): string => `${OFFICIAL_PREFIX}${dir}`

export type TemplateLayout = {
  readonly refOf: (dir: string) => string
  readonly dirOf: (ref: string) => string | undefined
}

const officialLayout: TemplateLayout = {
  refOf: officialRefOf,
  dirOf: (ref) => (ref.startsWith(OFFICIAL_PREFIX) ? ref.slice(OFFICIAL_PREFIX.length).replace(/@.*$/, '') : undefined),
}

type Validated =
  | { readonly _tag: 'Valid'; readonly manifest: Manifest; readonly warnings: ReadonlyArray<ManifestIssue> }
  | { readonly _tag: 'Invalid'; readonly issues: ReadonlyArray<ManifestIssue> }

const validate = (files: TemplateFiles): Effect.Effect<Validated> =>
  validateTemplate(files).pipe(
    Effect.map((valid): Validated => ({ _tag: 'Valid', manifest: valid.manifest, warnings: valid.warnings })),
    Effect.catch((error) =>
      Effect.succeed<Validated>({
        _tag: 'Invalid',
        issues:
          error._tag === 'ManifestInvalidError'
            ? error.issues
            : [makeIssue(ManifestIssueCode.MISSING_FIELD, 'typika.toml', 'typika.toml is missing.')],
      })
    )
  )

const duplicateNames = (validated: ReadonlyMap<string, Validated>, dir: string, name: string) =>
  [...validated].some(([other, result]) => other < dir && result._tag === 'Valid' && result.manifest.name === name)
    ? [makeIssue(ManifestIssueCode.NAME_TAKEN, 'name', `Template name "${name}" is already registered.`)]
    : []

export const checkTemplates = (
  templates: TemplateSet,
  runners: TemplateRunners,
  { refOf, dirOf }: TemplateLayout = officialLayout
): Effect.Effect<ReadonlyArray<TemplateCheck>> =>
  Effect.gen(function* () {
    const validated = new Map<string, Validated>()
    for (const [dir, files] of templates) validated.set(dir, yield* validate(files))

    const manifestAt = (ref: string) => {
      const dir = dirOf(ref)
      const result = dir === undefined ? undefined : validated.get(dir)
      return result?._tag === 'Valid' ? result.manifest : undefined
    }

    return yield* Effect.forEach(
      [...validated].toSorted(([a], [b]) => a.localeCompare(b)),
      ([dir, result]) =>
        Effect.gen(function* () {
          if (result._tag === 'Invalid') return { dir, name: undefined, issues: result.issues, exercisesRun: false }
          const { manifest } = result
          const runner = runners[manifest.runtime.kind]
          const files = templates.get(dir) ?? new Map<string, string | Uint8Array>()
          const runsExercises = runner !== undefined && manifest.exercises.length > 0
          const baseDir = manifest.base === undefined ? undefined : dirOf(manifest.base.template)
          const exerciseIssues = runsExercises
            ? yield* checkExercises({
                manifest,
                files,
                base: baseDir === undefined ? undefined : templates.get(baseDir),
                runTests: runner.runTests,
              })
            : []
          return {
            dir,
            name: manifest.name,
            issues: [
              ...result.warnings,
              ...duplicateNames(validated, dir, manifest.name),
              ...checkRefs(manifest, refOf(dir), manifestAt),
              ...(runner?.checkFiles?.(files) ?? []),
              ...exerciseIssues,
            ],
            exercisesRun: runsExercises,
          }
        })
    )
  })
