import { useAtomSet, useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import { useEffect, useState } from 'react'

import { markSolvedAtom, solvedExercisesAtom } from '../../core/atoms/exercise.atoms.ts'
import {
  exerciseRunOf,
  isSolved,
  nextExercise,
  targetProgress,
} from '../../core/domain/exercise-progress.domain-model.ts'

export type UseExerciseOptions = {
  readonly templateName: string
  readonly exercise: { readonly name: string; readonly failing: ReadonlyArray<string> } | undefined
  readonly exercises: ReadonlyArray<{ readonly name: string }>
  readonly testRun: Parameters<typeof exerciseRunOf>[0]
}

const NONE: ReadonlyArray<string> = []

export const useExercise = ({ templateName, exercise, exercises, testRun }: UseExerciseOptions) => {
  const solved = Option.getOrElse(AsyncResult.value(useAtomValue(solvedExercisesAtom(templateName))), () => NONE)
  const markSolved = useAtomSet(markSolvedAtom(templateName))
  const [revealedHints, setRevealedHints] = useState(0)

  const run = exerciseRunOf(testRun)
  const solvedByRun = exercise !== undefined && run !== undefined && isSolved(run, exercise.failing)
  const exerciseName = exercise?.name

  useEffect(() => {
    if (solvedByRun && exerciseName !== undefined) markSolved(exerciseName)
  }, [solvedByRun, exerciseName, markSolved])

  const nextName =
    exercise === undefined
      ? undefined
      : nextExercise(
          exercises.map(({ name }) => name),
          exercise.name,
          solved
        )

  return {
    solved,
    progress: exercise === undefined || run === undefined ? undefined : targetProgress(run, exercise.failing),
    isSolved: solvedByRun || (exercise !== undefined && solved.includes(exercise.name)),
    next:
      nextName === undefined
        ? { kind: 'template' as const, href: `/play/${templateName}` }
        : { kind: 'exercise' as const, href: `/play/${templateName}?exercise=${nextName}` },
    revealedHints,
    handleRevealHint: () => setRevealedHints((count) => count + 1),
  }
}
