import { act, renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../core/exercise.test-layer.ts'
import { useExercise, type UseExerciseOptions } from './use-exercise.ts'

const EXERCISE = { name: 'fix-it', failing: ['tests/a.test.ts'] }
const EXERCISES = [{ name: 'add-option' }, { name: 'fix-it' }]

const finished = (status: 'passed' | 'failed') => ({
  outcome: { _tag: 'Finished' },
  tests: [{ file: 'tests/a.test.ts', status }],
  counts: { failed: status === 'failed' ? 1 : 0 },
})

const renderExercise = (initial: Partial<UseExerciseOptions> = {}, progress = makeExerciseProgressInMemory()) => {
  const rendered = renderHook((props: UseExerciseOptions) => useExercise(props), {
    initialProps: {
      templateName: 'sample-ts',
      exercise: EXERCISE,
      exercises: EXERCISES,
      testRun: undefined,
      ...initial,
    },
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({}),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        progress.layer
      )
    ),
  })
  return { ...rendered, progress }
}

describe('useExercise', () => {
  it('has no progress before a finished run', () => {
    const { result } = renderExercise()

    expect(result.current.progress).toBeUndefined()
    expect(result.current.isSolved).toBe(false)
  })

  it('remembers the exercise once every test passes', async () => {
    const { result, rerender, progress } = renderExercise({ testRun: finished('failed') })
    expect(result.current.progress).toEqual({ passed: 0, total: 1 })

    rerender({ templateName: 'sample-ts', exercise: EXERCISE, exercises: EXERCISES, testRun: finished('passed') })

    expect(result.current.isSolved).toBe(true)
    await waitFor(() => expect(progress.solved.get('sample-ts')).toEqual(['fix-it']))
  })

  it('shows an exercise solved earlier as solved', async () => {
    const { result } = renderExercise({}, makeExerciseProgressInMemory({ 'sample-ts': ['fix-it'] }))

    await waitFor(() => expect(result.current.isSolved).toBe(true))
  })

  it('leads to the next exercise not solved yet, or back to the template', async () => {
    const { result } = renderExercise()
    expect(result.current.next).toEqual({ kind: 'exercise', href: '/play/sample-ts?exercise=add-option' })

    const solvedElsewhere = renderExercise({}, makeExerciseProgressInMemory({ 'sample-ts': ['add-option'] }))
    await waitFor(() =>
      expect(solvedElsewhere.result.current.next).toEqual({ kind: 'template', href: '/play/sample-ts' })
    )
  })

  it('reveals the hints one by one', () => {
    const { result } = renderExercise()

    act(() => result.current.handleRevealHint())
    act(() => result.current.handleRevealHint())

    expect(result.current.revealedHints).toBe(2)
  })
})
