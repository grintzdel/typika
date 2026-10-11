import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import type { Exercise } from '../domain/manifest.domain-model.ts'
import type { TemplateFiles } from '../domain/template-files.domain-model.ts'
import { exerciseStates } from './exercise-states.ts'

const files = (entries: Readonly<Record<string, string>>): TemplateFiles => new Map(Object.entries(entries))

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  name: 'add-option',
  kind: 'fix',
  title: 'Add an option',
  from: 'self',
  failing: ['tests/option.test.ts'],
  solutionFrom: 'start',
  hints: [],
  ...overrides,
})

const TEMPLATE = files({
  'typika.toml': 'template',
  'src/quote.ts': 'strategy',
  'src/old.ts': 'old',
  'tests/quote.test.ts': 'quote test',
  'exercises/add-option/README.md': '# Add',
  'exercises/add-option/start/tests/option.test.ts': 'option test',
  'exercises/add-option/start/src/quote.ts': 'quote to fix',
  'exercises/add-option/start/.typika-remove': 'src/old.ts\n\n',
  'exercises/add-option/solution/src/quote.ts': 'quote fixed',
  'exercises/other/start/src/other.ts': 'other',
})

const BASE = files({ 'typika.toml': 'base', 'src/quote.ts': 'naive', 'tests/quote.test.ts': 'quote test' })

const run = (input: Parameters<typeof exerciseStates>[0]) => Effect.runSyncExit(exerciseStates(input))

const valueOf = (exit: Exit.Exit<{ readonly start: TemplateFiles; readonly solution: TemplateFiles }, unknown>) =>
  Exit.isSuccess(exit)
    ? { start: Object.fromEntries(exit.value.start), solution: Object.fromEntries(exit.value.solution) }
    : undefined

describe('exerciseStates', () => {
  it('starts from the template with the start overlay and the removed paths', () => {
    expect(valueOf(run({ template: TEMPLATE, base: undefined, exercise: exercise() }))?.start).toEqual({
      'typika.toml': 'template',
      'src/quote.ts': 'quote to fix',
      'tests/quote.test.ts': 'quote test',
      'tests/option.test.ts': 'option test',
    })
  })

  it('applies the solution on the start state by default', () => {
    expect(valueOf(run({ template: TEMPLATE, base: undefined, exercise: exercise() }))?.solution).toEqual({
      'typika.toml': 'template',
      'src/quote.ts': 'quote fixed',
      'tests/quote.test.ts': 'quote test',
      'tests/option.test.ts': 'option test',
    })
  })

  it('starts from the base when asked', () => {
    expect(valueOf(run({ template: TEMPLATE, base: BASE, exercise: exercise({ from: 'base' }) }))?.start).toEqual({
      'typika.toml': 'base',
      'src/quote.ts': 'quote to fix',
      'tests/quote.test.ts': 'quote test',
      'tests/option.test.ts': 'option test',
    })
  })

  it('applies the solution on the template and the failing tests for solutionFrom self', () => {
    const states = valueOf(
      run({ template: TEMPLATE, base: BASE, exercise: exercise({ from: 'base', solutionFrom: 'self' }) })
    )

    expect(states?.solution).toEqual({
      'typika.toml': 'template',
      'src/quote.ts': 'quote fixed',
      'src/old.ts': 'old',
      'tests/quote.test.ts': 'quote test',
      'tests/option.test.ts': 'option test',
    })
  })

  it('fails when the exercise starts from a base that is missing', () => {
    const exit = run({ template: TEMPLATE, base: undefined, exercise: exercise({ from: 'base' }) })

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ExerciseBaseMissingError', exercise: 'add-option' },
    })
  })
})
