import {
  exerciseStates,
  makeIssue,
  ManifestIssueCode,
  type Exercise,
  type Manifest,
  type ManifestIssue,
  type TemplateFiles,
} from '@typika/manifest'
import * as Effect from 'effect/Effect'

export type TestRun =
  | {
      readonly _tag: 'Tested'
      readonly tests: ReadonlyArray<{ readonly file: string; readonly status: 'passed' | 'failed' | 'skipped' }>
    }
  | { readonly _tag: 'BuildFailed'; readonly message: string }

export type RunTests = (files: TemplateFiles, manifest: Manifest) => Effect.Effect<TestRun>

const startProblems = (run: TestRun, exercise: Exercise): ReadonlyArray<string> => {
  if (run._tag === 'BuildFailed') return [`the tests do not build: ${run.message}`]
  const failedFiles = new Set(run.tests.filter((test) => test.status === 'failed').map((test) => test.file))
  return [
    ...exercise.failing.filter((file) => !failedFiles.has(file)).map((file) => `"${file}" has no failing test`),
    ...[...failedFiles].filter((file) => !exercise.failing.includes(file)).map((file) => `"${file}" fails too`),
  ]
}

const isGreen = (run: TestRun) =>
  run._tag === 'Tested' && run.tests.length > 0 && run.tests.every((test) => test.status !== 'failed')

const checkExercise = (
  index: number,
  exercise: Exercise,
  { manifest, files, base, runTests }: CheckExercisesInput
): Effect.Effect<ReadonlyArray<ManifestIssue>> =>
  Effect.gen(function* () {
    const path = `exercises[${index}]`
    const startState = (reason: string) =>
      makeIssue(
        ManifestIssueCode.EXERCISE_START_STATE,
        path,
        `Exercise "${exercise.name}": starting state is wrong (${reason}).`
      )
    const states = yield* Effect.result(exerciseStates({ template: files, base, exercise }))
    if (states._tag === 'Failure') return [startState('its base cannot be found')]
    const problems = startProblems(yield* runTests(states.success.start, manifest), exercise)
    const solution = yield* runTests(states.success.solution, manifest)
    return [
      ...(problems.length === 0 ? [] : [startState(problems.join('; '))]),
      ...(isGreen(solution)
        ? []
        : [
            makeIssue(
              ManifestIssueCode.EXERCISE_SOLUTION_FAILS,
              path,
              `Exercise "${exercise.name}": reference solution does not pass all tests.`
            ),
          ]),
    ]
  })

export type CheckExercisesInput = {
  readonly manifest: Manifest
  readonly files: TemplateFiles
  readonly base: TemplateFiles | undefined
  readonly runTests: RunTests
}

export const checkExercises = (input: CheckExercisesInput): Effect.Effect<ReadonlyArray<ManifestIssue>> =>
  Effect.map(
    Effect.forEach(input.manifest.exercises, (exercise, index) => checkExercise(index, exercise, input)),
    (issues) => issues.flat()
  )
