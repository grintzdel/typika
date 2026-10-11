import type { TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { manifestOf } from '../__tests__/manifest.factory.ts'
import { checkExercises, type RunTests } from './check-exercises.ts'

const EXERCISE = `
[[exercises]]
name = "implement-express"
kind = "fix"
title = "Implement express"
failing = ["tests/express.test.ts"]
`

const files = (entries: Readonly<Record<string, string>>): TemplateFiles => new Map(Object.entries(entries))

const TEMPLATE = files({
  'src/express.ts': 'done',
  'tests/express.test.ts': 'checks express',
  'tests/standard.test.ts': 'checks standard',
  'exercises/implement-express/start/src/express.ts': 'todo',
  'exercises/implement-express/solution/src/express.ts': 'done',
})

const runTests: RunTests = (state) =>
  Effect.succeed({
    _tag: 'Tested',
    tests: [
      { file: 'tests/express.test.ts', status: state.get('src/express.ts') === 'done' ? 'passed' : 'failed' },
      { file: 'tests/standard.test.ts', status: state.get('src/standard.ts') === 'broken' ? 'failed' : 'passed' },
    ],
  })

const check = (template: TemplateFiles, runner: RunTests = runTests) =>
  Effect.runPromise(
    checkExercises({ manifest: manifestOf({ extra: EXERCISE }), files: template, base: undefined, runTests: runner })
  )

describe('checkExercises', () => {
  it('accepts a red start on the failing files only and a green solution', async () => {
    expect(await check(TEMPLATE)).toEqual([])
  })

  it('reports a start state whose failing file passes', async () => {
    const issues = await check(new Map([...TEMPLATE, ['exercises/implement-express/start/src/express.ts', 'done']]))

    expect(issues).toEqual([
      {
        code: 'E_EXERCISE_START_STATE',
        path: 'exercises[0]',
        message: 'Exercise "implement-express": starting state is wrong ("tests/express.test.ts" has no failing test).',
      },
    ])
  })

  it('reports a start state where another file fails', async () => {
    const issues = await check(new Map([...TEMPLATE, ['exercises/implement-express/start/src/standard.ts', 'broken']]))

    expect(issues.map((issue) => issue.message)).toEqual([
      'Exercise "implement-express": starting state is wrong ("tests/standard.test.ts" fails too).',
      'Exercise "implement-express": reference solution does not pass all tests.',
    ])
  })

  it('reports a solution that does not pass', async () => {
    const issues = await check(new Map([...TEMPLATE, ['exercises/implement-express/solution/src/express.ts', 'todo']]))

    expect(issues.map((issue) => issue.code)).toEqual(['E_EXERCISE_SOLUTION_FAILS'])
  })

  it('reports tests that do not build', async () => {
    const issues = await check(TEMPLATE, () =>
      Effect.succeed({ _tag: 'BuildFailed', message: 'Unexpected end of file' })
    )

    expect(issues.map((issue) => issue.message)).toEqual([
      'Exercise "implement-express": starting state is wrong (the tests do not build: Unexpected end of file).',
      'Exercise "implement-express": reference solution does not pass all tests.',
    ])
  })
})
