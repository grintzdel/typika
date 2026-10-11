import { describe, expect, it } from 'vitest'

import {
  exerciseRunOf,
  isSolved,
  nextExercise,
  targetProgress,
  type ExerciseRun,
} from './exercise-progress.domain-model.ts'

const FAILING = ['tests/express.test.ts']

const run = (tests: ExerciseRun['tests']): ExerciseRun => ({
  tests,
  failed: tests.filter((test) => test.status === 'failed').length,
})

describe('exerciseRunOf', () => {
  const tests = [{ file: 'tests/express.test.ts', status: 'failed' as const }]

  it('keeps a finished run', () => {
    expect(exerciseRunOf({ outcome: { _tag: 'Finished' }, tests, counts: { failed: 1 } })).toEqual({ tests, failed: 1 })
  })

  it('ignores a run that is still going, or that did not finish', () => {
    expect(exerciseRunOf({ outcome: { _tag: 'Running' }, tests, counts: { failed: 1 } })).toBeUndefined()
    expect(exerciseRunOf({ outcome: { _tag: 'Crashed' }, tests: [], counts: { failed: 0 } })).toBeUndefined()
    expect(exerciseRunOf(undefined)).toBeUndefined()
  })
})

describe('targetProgress', () => {
  it('counts the passed tests of the target files', () => {
    const progress = targetProgress(
      run([
        { file: 'tests/express.test.ts', status: 'passed' },
        { file: 'tests/express.test.ts', status: 'failed' },
        { file: 'tests/standard.test.ts', status: 'passed' },
      ]),
      FAILING
    )

    expect(progress).toEqual({ passed: 1, total: 2 })
  })
})

describe('isSolved', () => {
  it('is solved when every test passes, target files included', () => {
    expect(
      isSolved(
        run([
          { file: 'tests/express.test.ts', status: 'passed' },
          { file: 'tests/standard.test.ts', status: 'passed' },
        ]),
        FAILING
      )
    ).toBe(true)
  })

  it('is not solved while another test fails', () => {
    expect(
      isSolved(
        run([
          { file: 'tests/express.test.ts', status: 'passed' },
          { file: 'tests/standard.test.ts', status: 'failed' },
        ]),
        FAILING
      )
    ).toBe(false)
  })

  it('is not solved when a target file has no passing test', () => {
    expect(isSolved(run([{ file: 'tests/standard.test.ts', status: 'passed' }]), FAILING)).toBe(false)
  })
})

describe('nextExercise', () => {
  const EXERCISES = ['a', 'b', 'c']

  it('picks the next exercise not solved yet, wrapping around', () => {
    expect(nextExercise(EXERCISES, 'b', [])).toBe('c')
    expect(nextExercise(EXERCISES, 'c', [])).toBe('a')
    expect(nextExercise(EXERCISES, 'a', ['b'])).toBe('c')
  })

  it('has no next exercise once every other one is solved', () => {
    expect(nextExercise(EXERCISES, 'a', ['b', 'c'])).toBeUndefined()
  })
})
