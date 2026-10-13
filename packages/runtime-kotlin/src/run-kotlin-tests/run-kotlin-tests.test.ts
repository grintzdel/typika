import { checkTestEventSequence, makeSuiteId, makeTestId, type TestEvent } from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import type { KotlinModuleGlobals } from '../domain/kotlin-module.domain-model.ts'
import { runKotlinTests, type RunKotlinTestsOptions } from './run-kotlin-tests.ts'

const MONEY_TEST = 'src/test/kotlin/shop/MoneyTest.kt'
const CART_TEST = 'src/test/kotlin/shop/CartTest.kt'
const ROOT_TEST = 'src/test/kotlin/RootTest.kt'

class AssertionError extends Error {}
class IllegalStateException extends Error {}

const failing = (error: Error, stack: string) => () => {
  error.stack = stack
  throw error
}

const shopModule = async ({ describe: suite, xdescribe, it: test, xit, console }: KotlinModuleGlobals) => {
  console.log('loading')
  suite('', () => {
    suite('RootTest', () => test('runs at the root', () => undefined))
  })
  suite('shop', () => {
    suite('MoneyTest', () => {
      test('adds amounts', () => console.log('adding'))
      test(
        'compares amounts',
        failing(new AssertionError('Expected <12.90 EUR>, actual <0.00 EUR>.'), 'AssertionError\n    at test:13')
      )
      test('refuses a negative amount', failing(new IllegalStateException('negative'), 'at main:4\n    at test:20'))
      xit('converts currencies', () => undefined)
    })
    xdescribe('CartTest', () => {
      test('adds a line', () => undefined)
    })
  })
}

const run = async (overrides: Partial<RunKotlinTestsOptions> = {}) => {
  const events: Array<TestEvent> = []
  await runKotlinTests({
    runId: 'run-1',
    load: shopModule,
    mapStack: (stack) =>
      [...stack.matchAll(/at (\w+):(\d+)/g)].map((match) => ({
        file: match[1] === 'main' ? 'src/main/kotlin/shop/Money.kt' : MONEY_TEST,
        line: Number(match[2]),
        column: 9,
      })),
    classes: new Map([
      ['RootTest', ROOT_TEST],
      ['shop.MoneyTest', MONEY_TEST],
      ['shop.CartTest', CART_TEST],
    ]),
    emit: (event) => events.push(event),
    ...overrides,
  })
  return events
}

const withoutTimes = (events: ReadonlyArray<TestEvent>) =>
  events.map((event) => {
    if (event._tag === 'RunStarted') return { ...event, startedAt: 0 }
    if (event._tag === 'TestPassed' || event._tag === 'TestFailed' || event._tag === 'RunFinished')
      return { ...event, durationMs: 0 }
    return event
  })

const base = (file: string, suiteId: string, suitePath: Array<string>, name: string) => ({
  runId: 'run-1',
  testId: makeTestId(file, suitePath, name),
  suiteId,
  name,
  file,
})

const moneyTest = (name: string) => makeTestId(MONEY_TEST, ['shop', 'MoneyTest'], name)

describe('runKotlinTests', () => {
  it('emits a well-formed run', async () => {
    expect(checkTestEventSequence(await run())).toEqual([])
  })

  it('reports each file under its package and class suites, then the outcome of each test', async () => {
    const events = withoutTimes(await run())
    const shopSuite = makeSuiteId(MONEY_TEST, ['shop'])
    const moneySuite = makeSuiteId(MONEY_TEST, ['shop', 'MoneyTest'])
    const rootSuite = makeSuiteId(ROOT_TEST, ['RootTest'])
    const cartShop = makeSuiteId(CART_TEST, ['shop'])
    const cartSuite = makeSuiteId(CART_TEST, ['shop', 'CartTest'])

    expect(events).toEqual([
      { _tag: 'RunStarted', runId: 'run-1', startedAt: 0 },
      { _tag: 'Output', runId: 'run-1', stream: 'stdout', chunk: 'loading\n' },
      { _tag: 'SuiteStarted', runId: 'run-1', suiteId: rootSuite, name: 'RootTest', file: ROOT_TEST },
      { _tag: 'TestPassed', ...base(ROOT_TEST, rootSuite, ['RootTest'], 'runs at the root'), durationMs: 0 },
      { _tag: 'SuiteFinished', runId: 'run-1', suiteId: rootSuite },
      { _tag: 'SuiteStarted', runId: 'run-1', suiteId: shopSuite, name: 'shop', file: MONEY_TEST },
      {
        _tag: 'SuiteStarted',
        runId: 'run-1',
        suiteId: moneySuite,
        parentId: shopSuite,
        name: 'MoneyTest',
        file: MONEY_TEST,
      },
      {
        _tag: 'Output',
        runId: 'run-1',
        testId: moneyTest('adds amounts'),
        stream: 'stdout',
        chunk: 'adding\n',
      },
      { _tag: 'TestPassed', ...base(MONEY_TEST, moneySuite, ['shop', 'MoneyTest'], 'adds amounts'), durationMs: 0 },
      {
        _tag: 'TestFailed',
        ...base(MONEY_TEST, moneySuite, ['shop', 'MoneyTest'], 'compares amounts'),
        durationMs: 0,
        failure: {
          message: 'Expected <12.90 EUR>, actual <0.00 EUR>.',
          expected: '12.90 EUR',
          actual: '0.00 EUR',
          stack: `Expected <12.90 EUR>, actual <0.00 EUR>.\n    at ${MONEY_TEST}:13:9`,
          location: { file: MONEY_TEST, line: 13, column: 9 },
        },
      },
      {
        _tag: 'TestFailed',
        ...base(MONEY_TEST, moneySuite, ['shop', 'MoneyTest'], 'refuses a negative amount'),
        durationMs: 0,
        failure: {
          message: 'IllegalStateException: negative',
          stack: `IllegalStateException: negative\n    at src/main/kotlin/shop/Money.kt:4:9\n    at ${MONEY_TEST}:20:9`,
          location: { file: MONEY_TEST, line: 20, column: 9 },
        },
      },
      {
        _tag: 'TestSkipped',
        ...base(MONEY_TEST, moneySuite, ['shop', 'MoneyTest'], 'converts currencies'),
        reason: 'skip',
      },
      { _tag: 'SuiteFinished', runId: 'run-1', suiteId: moneySuite },
      { _tag: 'SuiteFinished', runId: 'run-1', suiteId: shopSuite },
      { _tag: 'SuiteStarted', runId: 'run-1', suiteId: cartShop, name: 'shop', file: CART_TEST },
      {
        _tag: 'SuiteStarted',
        runId: 'run-1',
        suiteId: cartSuite,
        parentId: cartShop,
        name: 'CartTest',
        file: CART_TEST,
      },
      { _tag: 'TestSkipped', ...base(CART_TEST, cartSuite, ['shop', 'CartTest'], 'adds a line'), reason: 'skip' },
      { _tag: 'SuiteFinished', runId: 'run-1', suiteId: cartSuite },
      { _tag: 'SuiteFinished', runId: 'run-1', suiteId: cartShop },
      { _tag: 'RunFinished', runId: 'run-1', status: 'failed', passed: 2, failed: 2, skipped: 2, durationMs: 0 },
    ])
  })

  it('reports the warnings of the compilation before the tests', async () => {
    const warning = { severity: 'warning', message: 'unused', location: { file: MONEY_TEST, line: 3 } } as const

    const events = await run({ warnings: [warning] })

    expect(events[1]).toEqual({ _tag: 'Diagnostics', runId: 'run-1', diagnostics: [warning] })
  })

  it('runs only the tests of the selected files', async () => {
    const events = await run({ files: [ROOT_TEST] })

    expect(events.filter((event) => event._tag === 'SuiteStarted').map((event) => event.file)).toEqual([ROOT_TEST])
    expect(events.at(-1)).toMatchObject({ status: 'passed', passed: 1, failed: 0, skipped: 0 })
  })

  it('skips the tests whose full name does not match the pattern', async () => {
    const events = await run({ namePattern: 'MoneyTest adds' })

    expect(events.flatMap((event) => (event._tag === 'TestPassed' ? [event.name] : []))).toEqual(['adds amounts'])
    expect(events.find((event) => event._tag === 'TestSkipped' && event.name === 'runs at the root')).toMatchObject({
      reason: 'filtered',
    })
  })

  it('reports a module that fails to load as an errored run', async () => {
    const events = await run({
      load: async () => {
        throw new IllegalStateException('static init failed')
      },
    })

    expect(withoutTimes(events)).toEqual([
      { _tag: 'RunStarted', runId: 'run-1', startedAt: 0 },
      {
        _tag: 'Diagnostics',
        runId: 'run-1',
        diagnostics: [
          { severity: 'error', message: 'The tests could not load: IllegalStateException: static init failed' },
        ],
      },
      { _tag: 'RunFinished', runId: 'run-1', status: 'errored', passed: 0, failed: 0, skipped: 0, durationMs: 0 },
    ])
  })
})
