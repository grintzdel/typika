import * as Effect from 'effect/Effect'

import { ExerciseBaseMissingError } from '../domain/errors/exercise-base-missing.error.ts'
import type { Exercise } from '../domain/manifest.domain-model.ts'
import type { TemplateFiles } from '../domain/template-files.domain-model.ts'

export type ExerciseStates = {
  readonly start: TemplateFiles
  readonly solution: TemplateFiles
}

const EXERCISES_DIR = 'exercises/'
const REMOVE_LIST = '.typika-remove'

const withoutExercises = (files: TemplateFiles): TemplateFiles =>
  new Map([...files].filter(([path]) => !path.startsWith(EXERCISES_DIR)))

const overlayOf = (files: TemplateFiles, exercise: string, folder: 'start' | 'solution'): TemplateFiles => {
  const prefix = `${EXERCISES_DIR}${exercise}/${folder}/`
  return new Map(
    [...files]
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, content]): [string, string | Uint8Array] => [path.slice(prefix.length), content])
  )
}

const removedPaths = (overlay: TemplateFiles): ReadonlySet<string> => {
  const list = overlay.get(REMOVE_LIST)
  const text = typeof list === 'string' ? list : list === undefined ? '' : new TextDecoder().decode(list)
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
  )
}

const applied = (state: TemplateFiles, overlay: TemplateFiles): TemplateFiles =>
  new Map([...state, ...[...overlay].filter(([path]) => path !== REMOVE_LIST)])

export const exerciseStates = ({
  template,
  base,
  exercise,
}: {
  readonly template: TemplateFiles
  readonly base: TemplateFiles | undefined
  readonly exercise: Exercise
}): Effect.Effect<ExerciseStates, ExerciseBaseMissingError> =>
  Effect.gen(function* () {
    if (exercise.from === 'base' && base === undefined)
      return yield* new ExerciseBaseMissingError({ exercise: exercise.name })
    const from = withoutExercises(exercise.from === 'base' && base !== undefined ? base : template)
    const start = overlayOf(template, exercise.name, 'start')
    const removed = removedPaths(start)
    const startState = applied(new Map([...from].filter(([path]) => !removed.has(path))), start)
    const solution = overlayOf(template, exercise.name, 'solution')
    if (exercise.solutionFrom === 'start') return { start: startState, solution: applied(startState, solution) }
    const failing = new Map([...start].filter(([path]) => exercise.failing.includes(path)))
    return { start: startState, solution: applied(applied(withoutExercises(template), failing), solution) }
  })
