import {
  makeIssue,
  ManifestIssueCode,
  validateTemplate,
  withoutExercises,
  type Manifest,
  type ManifestIssue,
  type TemplateFiles,
} from '@typika/manifest'
import type { RegistryIndex } from '@typika/registry-tools/index-schema'
import { checkExercises, checkTourOrder, type TemplateRunner } from '@typika/template-check'
import * as Effect from 'effect/Effect'

import { pinnedVia } from '../locate-template/locate-template.ts'
import type { TemplateSource } from '../template-source/template-source.ts'

export type ValidateOptions = {
  readonly files: TemplateFiles
  readonly index: RegistryIndex | undefined
  readonly source: TemplateSource
  readonly run: boolean
  readonly runnerOf: (manifest: Manifest) => TemplateRunner | undefined
}

export type ValidationReport = {
  readonly name: string | undefined
  readonly issues: ReadonlyArray<ManifestIssue>
  readonly notes: ReadonlyArray<string>
}

const REFERENCE_LANGUAGE = 'typescript'

const filesAt = (source: TemplateSource, index: RegistryIndex | undefined, ref: string) =>
  Effect.option(source.files(pinnedVia(index, ref).ref))

const referenceTourIds = (source: TemplateSource, index: RegistryIndex | undefined, ref: string) =>
  Effect.gen(function* () {
    const files = yield* filesAt(source, index, ref)
    if (files._tag === 'None') return undefined
    const reference = yield* Effect.option(validateTemplate(files.value))
    return reference._tag === 'None' ? undefined : reference.value.tourSteps.map((step) => step.id)
  })

const testsIssues = (runner: TemplateRunner, files: TemplateFiles, manifest: Manifest) =>
  Effect.map(runner.runTests(withoutExercises(files), manifest), (run) => {
    if (run._tag === 'BuildFailed') return [`they do not build: ${run.message}`]
    const failed = run.tests.filter((test) => test.status === 'failed').map((test) => test.file)
    if (run.tests.length === 0) return ['no test ran']
    return failed.length === 0 ? [] : [`failing in ${[...new Set(failed)].join(', ')}`]
  }).pipe(
    Effect.map((reasons) =>
      reasons.map((reason) =>
        makeIssue(ManifestIssueCode.TESTS_FAIL, 'tests', `The tests of the template do not pass (${reason}).`)
      )
    )
  )

export const validateProject = ({ files, index, source, run, runnerOf }: ValidateOptions) =>
  Effect.gen(function* () {
    const notes: Array<string> = []
    if (index === undefined) notes.push('The registry index is not reachable: topics were not checked.')
    const knownTopics = index === undefined ? undefined : new Set(index.vocabulary.topics.map((topic) => topic.id))
    const validated = yield* Effect.result(validateTemplate(files, knownTopics === undefined ? {} : { knownTopics }))
    if (validated._tag === 'Failure') {
      const error = validated.failure
      const issues =
        error._tag === 'ManifestInvalidError'
          ? error.issues
          : [makeIssue(ManifestIssueCode.MISSING_FIELD, 'typika.toml', 'typika.toml is missing.')]
      return { name: undefined, issues, notes } satisfies ValidationReport
    }
    const { manifest, tourSteps, warnings } = validated.success

    const referenceRef = manifest.variants?.[REFERENCE_LANGUAGE]
    const referenceIds =
      manifest.facets.language === REFERENCE_LANGUAGE || referenceRef === undefined
        ? undefined
        : yield* referenceTourIds(source, index, referenceRef)
    if (referenceRef !== undefined && manifest.facets.language !== REFERENCE_LANGUAGE && referenceIds === undefined)
      notes.push(`The TypeScript variant ${referenceRef} is not reachable: the tour order was not compared.`)
    const tourIssues = checkTourOrder(
      manifest,
      tourSteps.map((step) => step.id),
      () => referenceIds
    )

    const runner = run ? runnerOf(manifest) : undefined
    if (run && runner === undefined)
      notes.push(`No ${manifest.runtime.kind} runner: the tests and exercises were not run.`)
    const base =
      runner !== undefined && manifest.base !== undefined && manifest.exercises.some(({ from }) => from === 'base')
        ? yield* filesAt(source, index, manifest.base.template)
        : undefined
    const runIssues =
      runner === undefined
        ? []
        : [
            ...(runner.checkFiles?.(files) ?? []),
            ...(yield* testsIssues(runner, files, manifest)),
            ...(yield* checkExercises({
              manifest,
              files,
              base: base?._tag === 'Some' ? base.value : undefined,
              runTests: runner.runTests,
            })),
          ]

    return { name: manifest.name, issues: [...warnings, ...tourIssues, ...runIssues], notes } satisfies ValidationReport
  })
