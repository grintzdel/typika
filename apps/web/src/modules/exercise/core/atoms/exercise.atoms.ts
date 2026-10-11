import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { listSolvedProgram } from '../programs/list-solved/list-solved.program.ts'
import { markSolvedProgram } from '../programs/mark-solved/mark-solved.program.ts'

export const solvedExercisesAtom = Atom.family((template: string) => appRuntime.atom(listSolvedProgram(template)))

export const markSolvedAtom = Atom.family((template: string) =>
  appRuntime.fn((exercise: string, get) =>
    Effect.gen(function* () {
      yield* markSolvedProgram(template, exercise)
      get.refresh(solvedExercisesAtom(template))
    })
  )
)
