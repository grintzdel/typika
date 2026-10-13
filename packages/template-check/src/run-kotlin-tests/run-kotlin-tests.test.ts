import { join } from 'node:path'

import { providedKotlinCompilerUrl } from '@typika/kotlin-compiler/provided'
import { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import { checkTemplates, type TemplateRunners, type TemplateSet } from '../check-templates/check-templates.ts'
import { listFilesWithGit, readTemplates } from '../read-templates/read-templates.ts'
import { makeKotlinRunner } from './run-kotlin-tests.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..', 'templates')
const STRATEGY = 'strategy/kotlin'
const EXPRESS_SOLUTION = 'exercises/implement-express/solution/src/main/kotlin/checkout/ExpressShipping.kt'

let templates: TemplateSet
let runners: TemplateRunners

beforeAll(async () => {
  templates = await readTemplates(ROOT, listFilesWithGit)
  runners = { [RuntimeKind.KOTLIN]: makeKotlinRunner(providedKotlinCompilerUrl()) }
})

const strategyCheck = async (overrides: Readonly<Record<string, string>> = {}) => {
  const set = new Map([
    ...templates,
    [STRATEGY, new Map([...(templates.get(STRATEGY) ?? []), ...Object.entries(overrides)])],
  ])
  const checks = await Effect.runPromise(checkTemplates(set, runners))
  return checks.find((check) => check.dir === STRATEGY)
}

const strategyText = (path: string): string => {
  const content = templates.get(STRATEGY)?.get(path)
  if (typeof content !== 'string') throw new Error(`No text file at ${path}`)
  return content
}

describe('makeKotlinRunner', () => {
  it('runs the exercises of strategy-kotlin and passes it', async () => {
    const strategy = await strategyCheck()

    expect(strategy).toMatchObject({ name: 'strategy-kotlin', exercisesRun: true })
    expect(strategy?.issues.filter((issue) => issue.code.startsWith('E_'))).toEqual([])
  })

  it('fails an exercise whose solution is broken', async () => {
    const strategy = await strategyCheck({
      [EXPRESS_SOLUTION]: strategyText(EXPRESS_SOLUTION).replace('1290', '1300'),
    })

    expect(strategy?.issues.map((issue) => issue.code)).toContain('E_EXERCISE_SOLUTION_FAILS')
  })

  it('reports a start state that does not compile', async () => {
    const strategy = await strategyCheck({
      [EXPRESS_SOLUTION.replace('/solution/', '/start/')]: 'package checkout\n\nval broken: Int = "zero"\n',
    })

    expect(strategy?.issues.find((issue) => issue.code === 'E_EXERCISE_START_STATE')?.message).toContain(
      'the tests do not build'
    )
  })
})
