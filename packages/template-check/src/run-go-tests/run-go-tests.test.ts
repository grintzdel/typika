import { join } from 'node:path'

import { RuntimeKind } from '@typika/manifest'
import { loadGoToolchainFromDisk } from '@typika/runtime-go/node'
import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import { checkTemplates, type TemplateRunners, type TemplateSet } from '../check-templates/check-templates.ts'
import { listFilesWithGit, readTemplates } from '../read-templates/read-templates.ts'
import { makeGoRunner } from './run-go-tests.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..', 'templates')
const STRATEGY = 'strategy/go'
const EXPRESS_SOLUTION = 'exercises/implement-express/solution/internal/checkout/express.go'
const MAIN = 'cmd/shop/main.go'

let templates: TemplateSet
let runners: TemplateRunners

beforeAll(async () => {
  const all = await readTemplates(ROOT, listFilesWithGit)
  templates = new Map([...all].filter(([dir]) => dir.startsWith('strategy/') || dir.startsWith('strategy-base/')))
  runners = { [RuntimeKind.GO]: makeGoRunner(await loadGoToolchainFromDisk()) }
})

const strategyText = (path: string): string => {
  const content = templates.get(STRATEGY)?.get(path)
  if (typeof content !== 'string') throw new Error(`No text file at ${path}`)
  return content
}

const strategyCheck = async (overrides: Readonly<Record<string, string>> = {}) => {
  const set = new Map([
    ...templates,
    [STRATEGY, new Map([...(templates.get(STRATEGY) ?? []), ...Object.entries(overrides)])],
  ])
  const checks = await Effect.runPromise(checkTemplates(set, runners))
  return checks.find((check) => check.dir === STRATEGY)
}

describe('makeGoRunner', { timeout: 60_000 }, () => {
  it('runs the exercises of strategy-go and passes it', async () => {
    const strategy = await strategyCheck()

    expect(strategy).toMatchObject({ name: 'strategy-go', exercisesRun: true })
    expect(strategy?.issues.filter((issue) => issue.code.startsWith('E_'))).toEqual([])
  })

  it('fails an exercise whose solution is broken', async () => {
    const strategy = await strategyCheck({
      [EXPRESS_SOLUTION]: strategyText(EXPRESS_SOLUTION).replace('1290', '1300'),
    })

    expect(strategy?.issues.map((issue) => issue.code)).toContain('E_EXERCISE_SOLUTION_FAILS')
  })

  it('reports an import that the Go runtime cannot provide', async () => {
    const strategy = await strategyCheck({ [MAIN]: strategyText(MAIN).replace('"log"', '"net/http"') })

    expect(strategy?.issues).toContainEqual({
      code: 'E_GO_IMPORT_UNAVAILABLE',
      path: 'cmd/shop/main.go:5',
      message: 'package net/http is not in the standard library that Typika ships for the browser.',
    })
  })
})
