export type ExerciseRun = {
  readonly tests: ReadonlyArray<{ readonly file: string; readonly status: 'passed' | 'failed' | 'skipped' }>
  readonly failed: number
}

type FinishedRun = {
  readonly outcome: { readonly _tag: string }
  readonly tests: ExerciseRun['tests']
  readonly counts: { readonly failed: number }
}

export const exerciseRunOf = (run: FinishedRun | undefined): ExerciseRun | undefined =>
  run?.outcome._tag === 'Finished' ? { tests: run.tests, failed: run.counts.failed } : undefined

export type TargetProgress = { readonly passed: number; readonly total: number }

export const targetProgress = (run: ExerciseRun, failing: ReadonlyArray<string>): TargetProgress => {
  const targets = run.tests.filter((test) => failing.includes(test.file))
  return { passed: targets.filter((test) => test.status === 'passed').length, total: targets.length }
}

export const isSolved = (run: ExerciseRun, failing: ReadonlyArray<string>): boolean =>
  run.failed === 0 && failing.every((file) => run.tests.some((test) => test.file === file && test.status === 'passed'))

export const nextExercise = (
  exercises: ReadonlyArray<string>,
  current: string,
  solved: ReadonlyArray<string>
): string | undefined => {
  const index = exercises.indexOf(current)
  return [...exercises.slice(index + 1), ...exercises.slice(0, index)].find((name) => !solved.includes(name))
}
