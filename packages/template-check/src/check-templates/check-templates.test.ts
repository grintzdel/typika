import { join } from 'node:path'

import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import { listFilesWithGit, readTemplates } from '../read-templates/read-templates.ts'
import { inProcessRunners } from '../run-tests-in-process/run-tests-in-process.ts'
import { checkTemplates, type TemplateSet } from './check-templates.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..', 'templates')
const STRATEGY = 'strategy/ts'
const EXPRESS_SOLUTION = 'exercises/implement-express/solution/src/checkout/options/express.ts'
const PICKUP_START = 'exercises/add-pickup-point-option/start/tests/pickup-point.test.ts'

let templates: TemplateSet

beforeAll(async () => {
  templates = await readTemplates(ROOT, listFilesWithGit)
})

const strategyText = (path: string): string => {
  const content = templates.get(STRATEGY)?.get(path)
  if (typeof content !== 'string') throw new Error(`No text file at ${path}`)
  return content
}

const withFiles = (dir: string, overrides: Readonly<Record<string, string>>): TemplateSet =>
  new Map([...templates, [dir, new Map([...(templates.get(dir) ?? []), ...Object.entries(overrides)])]])

const withStrategyFiles = (overrides: Readonly<Record<string, string>>): TemplateSet => withFiles(STRATEGY, overrides)

const issuesOf = async (set: TemplateSet, dir: string) => {
  const checks = await Effect.runPromise(checkTemplates(set, {}))
  return checks.find((check) => check.dir === dir)?.issues ?? []
}

const strategyIssues = async (set: TemplateSet) => {
  const strategyOnly = new Map(
    [...set].filter(([dir]) => dir.startsWith('strategy/') || dir.startsWith('strategy-base/'))
  )
  const checks = await Effect.runPromise(checkTemplates(strategyOnly, inProcessRunners))
  return checks.find((check) => check.dir === STRATEGY)
}

describe('checkTemplates on the templates of the repository', { timeout: 30_000 }, () => {
  it('finds every template and passes strategy-ts with its exercises run', async () => {
    const strategy = await strategyIssues(templates)

    expect([...templates.keys()]).toEqual(expect.arrayContaining([STRATEGY, 'strategy-base/ts', 'strategy/go']))
    expect(strategy).toMatchObject({ name: 'strategy-ts', exercisesRun: true })
    expect(strategy?.issues.filter((issue) => issue.code.startsWith('E_'))).toEqual([])
  })

  it('fails an exercise whose solution is broken', async () => {
    const strategy = await strategyIssues(
      withStrategyFiles({
        [EXPRESS_SOLUTION]: strategyText(EXPRESS_SOLUTION).replace('1290', '1300'),
      })
    )

    expect(strategy?.issues.map((issue) => issue.code)).toContain('E_EXERCISE_SOLUTION_FAILS')
  })

  it('fails an exercise whose failing test already passes at the start', async () => {
    const strategy = await strategyIssues(
      withStrategyFiles({ [PICKUP_START]: "import { it } from 'vitest'\nit('passes already', () => {})\n" })
    )

    expect(strategy?.issues).toContainEqual({
      code: 'E_EXERCISE_START_STATE',
      path: 'exercises[0]',
      message:
        'Exercise "add-pickup-point-option": starting state is wrong ("tests/pickup-point.test.ts" has no failing test).',
    })
  })

  it('warns when a variant shows the shared tour steps in another order than its TypeScript reference', async () => {
    const manifest = templates.get('strategy/go')?.get('typika.toml')
    if (typeof manifest !== 'string') throw new Error('No manifest for strategy/go')
    const swapped = manifest.replace(
      '"tour/03-strategy-interface.md",\n  "tour/04-context.md",',
      '"tour/04-context.md",\n  "tour/03-strategy-interface.md",'
    )

    expect(await issuesOf(withFiles('strategy/go', { 'typika.toml': swapped }), 'strategy/go')).toContainEqual(
      expect.objectContaining({ code: 'W_TOUR_ORDER_DIVERGES', path: 'tour.steps' })
    )
  })

  it('finds no variant whose tour diverges from its TypeScript reference', async () => {
    const checks = await Effect.runPromise(checkTemplates(templates, {}))

    expect(
      checks.filter((check) => check.issues.some((issue) => issue.code === 'W_TOUR_ORDER_DIVERGES')).map((c) => c.dir)
    ).toEqual([])
  })
})
