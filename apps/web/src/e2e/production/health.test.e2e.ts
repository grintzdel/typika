import { expect, test } from '@playwright/test'
import { makePlaywrightProbe } from '@typika/registry-tools/health-probe'
import { RegistryIndexSchema, type IndexTemplate } from '@typika/registry-tools/index-schema'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { APP_URL, TEST_REGISTRY_URL } from './production-urls.ts'

const PROBE_TIMEOUT = 180_000

const strategyOf = async (): Promise<IndexTemplate> => {
  const index = Schema.decodeUnknownSync(RegistryIndexSchema)(
    await (await fetch(`${TEST_REGISTRY_URL}/index.json`)).json()
  )
  const strategy = index.templates.find((template) => template.name === 'strategy-ts')
  if (strategy === undefined) throw new Error('strategy-ts is not in the test registry')
  return strategy
}

test.describe('health probe', () => {
  test.setTimeout(PROBE_TIMEOUT)

  test('boots a template, runs its tests and replays its exercises', async ({ browser }) => {
    const probe = makePlaywrightProbe(browser, APP_URL)

    const result = await Effect.runPromise(probe(await strategyOf()))

    expect(result).toEqual({ checks: { boot: 'pass', tests: 'pass', exercises: 'pass' }, notes: [] })
  })

  test('fails the exercises of a template whose exercise cannot be opened', async ({ browser }) => {
    const strategy = await strategyOf()
    const probe = makePlaywrightProbe(browser, APP_URL)

    const result = await Effect.runPromise(
      probe({
        ...strategy,
        manifest: {
          ...strategy.manifest,
          exercises: [{ name: 'does-not-exist', kind: 'fix', title: 'Does not exist' }],
        },
      })
    )

    expect(result.checks).toEqual({ boot: 'pass', tests: 'pass', exercises: 'fail' })
    expect(result.notes).toEqual([expect.stringMatching(/^exercises: /)])
  })

  test('fails the boot of a template the registry does not have', async ({ browser }) => {
    const strategy = await strategyOf()
    const probe = makePlaywrightProbe(browser, APP_URL)

    const result = await Effect.runPromise(probe({ ...strategy, name: 'does-not-exist' }))

    expect(result.checks).toEqual({ boot: 'fail', tests: 'skip', exercises: 'skip' })
  })
})
