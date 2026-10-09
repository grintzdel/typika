import { makeSuiteId as coreSuiteId, makeTestId as coreTestId } from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import type { TestEvent } from './events.ts'
import * as typika from './index.ts'
import { runTests, type TestFile } from './run-tests.ts'

const run = async (files: ReadonlyArray<TestFile>, namePattern?: string) => {
  const events: Array<TestEvent> = []
  await runTests({
    runId: 'run-1',
    files,
    ...(namePattern === undefined ? {} : { namePattern }),
    emit: (event) => events.push(event),
  })
  return events
}

const tagsOf = (events: ReadonlyArray<TestEvent>) =>
  events.map((event) => ('name' in event ? `${event._tag} ${event.name}` : event._tag))

const failureOf = (events: ReadonlyArray<TestEvent>) => {
  const failed = events.find((event) => event._tag === 'TestFailed')
  return failed?._tag === 'TestFailed' ? failed.failure : undefined
}

describe('runTests', () => {
  it('skips the tests that do not match the name pattern as filtered', async () => {
    const events = await run(
      [
        {
          path: 'order.test.ts',
          load: () => {
            typika.describe('Order', () => {
              typika.it('computes the total', () => {})
              typika.it('lists its lines', () => {})
            })
          },
        },
      ],
      'Order computes'
    )

    expect(tagsOf(events)).toContain('TestPassed computes the total')
    expect(events.find((event) => event._tag === 'TestSkipped')).toMatchObject({
      name: 'lists its lines',
      reason: 'filtered',
    })
  })

  it('gives tests and suites the ids of runtime-core', async () => {
    const events = await run([
      {
        path: 'src/order.test.ts',
        load: () => {
          typika.describe('Order', () => {
            typika.it('sums the lines', () => {})
          })
        },
      },
    ])

    expect(events.find((event) => event._tag === 'SuiteStarted')).toMatchObject({
      suiteId: coreSuiteId('src/order.test.ts', ['Order']),
    })
    expect(events.find((event) => event._tag === 'TestPassed')).toMatchObject({
      testId: coreTestId('src/order.test.ts', ['Order'], 'sums the lines'),
    })
  })

  it('reports console output outside a test without a testId', async () => {
    const events = await run([
      {
        path: 'a.test.ts',
        load: () => {
          typika.beforeAll(() => {
            console.log('setting up', { id: 1 })
          })
          typika.it('works', () => {})
        },
      },
    ])

    expect(events).toContainEqual({ _tag: 'Output', runId: 'run-1', stream: 'stdout', chunk: 'setting up { id: 1 }\n' })
  })

  it('restores the console after the run', async () => {
    const log = console.log

    await run([{ path: 'a.test.ts', load: () => typika.it('logs', () => console.log('x')) }])

    expect(console.log).toBe(log)
  })

  it('times a test out even when it installed fake timers', async () => {
    const events = await run([
      {
        path: 'a.test.ts',
        load: () => {
          typika.afterEach(() => {
            typika.vi.useRealTimers()
          })
          typika.it(
            'waits forever',
            () => {
              typika.vi.useFakeTimers()
              return new Promise(() => {})
            },
            20
          )
        },
      },
    ])

    expect(failureOf(events)?.message).toMatch(/^Test timed out in 20ms\./)
  })

  it('reports a file that fails to load as a diagnostic and an errored run', async () => {
    const events = await run([
      {
        path: 'a.test.ts',
        load: () => {
          throw new SyntaxError('Unexpected token')
        },
      },
    ])

    expect(tagsOf(events)).toEqual(['RunStarted', 'Diagnostics', 'RunFinished'])
    expect(events.at(-1)).toMatchObject({ status: 'errored' })
  })

  it('gives the expected and actual values of a failed assertion', async () => {
    const events = await run([
      { path: 'a.test.ts', load: () => typika.it('compares', () => typika.expect({ total: 3 }).toEqual({ total: 4 })) },
    ])

    expect(failureOf(events)).toMatchObject({ expected: '{\n  "total": 4,\n}', actual: '{\n  "total": 3,\n}' })
  })
})
