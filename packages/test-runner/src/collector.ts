import { formatEachName } from './each.ts'
import type { Assertion } from './expect.ts'
import { expect } from './expect.ts'

export type Mode = 'run' | 'only' | 'skip' | 'todo'

export type HookFunction = () => unknown

export type Hook = { readonly fn: HookFunction; readonly timeout: number | undefined }

export type TestNode = {
  readonly type: 'test'
  readonly name: string
  mode: Mode
  filtered: boolean
  readonly fn: (() => unknown) | undefined
  readonly timeout: number | undefined
}

export type SuiteNode = {
  readonly type: 'suite'
  readonly name: string
  mode: Mode
  readonly factory: (() => unknown) | undefined
  readonly children: Array<TestNode | SuiteNode>
  readonly hooks: {
    readonly beforeAll: Array<Hook>
    readonly afterAll: Array<Hook>
    readonly beforeEach: Array<Hook>
    readonly afterEach: Array<Hook>
  }
}

export interface TestContext {
  readonly expect: <T>(actual: T) => Assertion<T>
  readonly task: { readonly name: string }
}

export type TestOptions = {
  readonly timeout?: number
  readonly skip?: boolean
  readonly only?: boolean
  readonly todo?: boolean
}

export type TestFunction = (context: TestContext) => unknown

type EachArgs<T> = T extends ReadonlyArray<unknown> ? T : [T]

type EachTest<T> = (name: string, fn: (...args: EachArgs<T>) => unknown, options?: number | TestOptions) => void

type EachSuite<T> = (name: string, fn: (...args: EachArgs<T>) => unknown) => void

export interface TestAPI {
  (name: string, fn?: TestFunction, options?: number | TestOptions): void
  (name: string, options: TestOptions, fn?: TestFunction): void
  readonly only: TestAPI
  readonly skip: TestAPI
  readonly todo: (name: string, fn?: TestFunction) => void
  readonly each: <T>(cases: ReadonlyArray<T>) => EachTest<T>
  readonly skipIf: (condition: unknown) => TestAPI
  readonly runIf: (condition: unknown) => TestAPI
}

export interface SuiteAPI {
  (name: string, fn?: () => unknown, options?: number | TestOptions): void
  (name: string, options: TestOptions, fn?: () => unknown): void
  readonly only: SuiteAPI
  readonly skip: SuiteAPI
  readonly todo: (name: string, fn?: () => unknown) => void
  readonly each: <T>(cases: ReadonlyArray<T>) => EachSuite<T>
  readonly skipIf: (condition: unknown) => SuiteAPI
  readonly runIf: (condition: unknown) => SuiteAPI
}

let current: SuiteNode | undefined

const currentSuite = (): SuiteNode => {
  if (current === undefined) throw new Error('Vitest API calls are only allowed while a test file is being collected')
  return current
}

export const makeSuite = (name: string, mode: Mode, factory?: () => unknown): SuiteNode => ({
  type: 'suite',
  name,
  mode,
  factory,
  children: [],
  hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] },
})

type Second<F> = F | TestOptions | undefined
type Third<F> = F | TestOptions | number | undefined

const normalize = <F extends (...args: never[]) => unknown>(
  second: Second<F>,
  third: Third<F>
): { readonly fn: F | undefined; readonly options: TestOptions } => {
  if (typeof second === 'function' || second === undefined) {
    const options = typeof third === 'number' ? { timeout: third } : typeof third === 'object' ? third : {}
    return { fn: second, options }
  }
  return { fn: typeof third === 'function' ? third : undefined, options: second }
}

const modeOf = (base: Mode, options: TestOptions, hasFn: boolean): Mode => {
  if (!hasFn || options.todo === true) return 'todo'
  if (options.skip === true) return 'skip'
  if (options.only === true) return 'only'
  return base
}

const addTest = (base: Mode, name: string, second: Second<TestFunction>, third: Third<TestFunction>) => {
  const { fn, options } = normalize(second, third)
  currentSuite().children.push({
    type: 'test',
    name,
    mode: modeOf(base, options, fn !== undefined),
    filtered: false,
    fn: fn === undefined ? undefined : () => fn({ expect, task: { name } }),
    timeout: options.timeout,
  })
}

const addSuite = (base: Mode, name: string, second: Second<() => unknown>, third: Third<() => unknown>) => {
  const { fn, options } = normalize(second, third)
  currentSuite().children.push(makeSuite(name, modeOf(base, options, fn !== undefined), fn))
}

const asArgs = <T>(item: T): EachArgs<T> => (Array.isArray(item) ? item : [item]) as EachArgs<T>

const makeTestApi = (base: Mode): TestAPI => {
  const api = (name: string, second?: Second<TestFunction>, third?: Third<TestFunction>) =>
    addTest(base, name, second, third)
  return Object.defineProperties(api, {
    only: { get: () => makeTestApi('only') },
    skip: { get: () => makeTestApi('skip') },
    todo: { value: (name: string) => addTest('todo', name, undefined, undefined) },
    each: {
      value:
        <T>(cases: ReadonlyArray<T>): EachTest<T> =>
        (name, fn, options) => {
          for (const [index, item] of cases.entries()) {
            const args = asArgs(item)
            addTest(base, formatEachName(name, args, index), () => fn(...args), options)
          }
        },
    },
    skipIf: { value: (condition: unknown) => makeTestApi(condition ? 'skip' : base) },
    runIf: { value: (condition: unknown) => makeTestApi(condition ? base : 'skip') },
  }) as unknown as TestAPI
}

const makeSuiteApi = (base: Mode): SuiteAPI => {
  const api = (name: string, second?: Second<() => unknown>, third?: Third<() => unknown>) =>
    addSuite(base, name, second, third)
  return Object.defineProperties(api, {
    only: { get: () => makeSuiteApi('only') },
    skip: { get: () => makeSuiteApi('skip') },
    todo: { value: (name: string) => addSuite('todo', name, undefined, undefined) },
    each: {
      value:
        <T>(cases: ReadonlyArray<T>): EachSuite<T> =>
        (name, fn) => {
          for (const [index, item] of cases.entries()) {
            const args = asArgs(item)
            addSuite(base, formatEachName(name, args, index), () => fn(...args), undefined)
          }
        },
    },
    skipIf: { value: (condition: unknown) => makeSuiteApi(condition ? 'skip' : base) },
    runIf: { value: (condition: unknown) => makeSuiteApi(condition ? base : 'skip') },
  }) as unknown as SuiteAPI
}

export const it = makeTestApi('run')
export const test = it
export const describe = makeSuiteApi('run')
export const suite = describe

const addHook =
  (kind: keyof SuiteNode['hooks']) =>
  (fn: HookFunction, timeout?: number): void => {
    currentSuite().hooks[kind].push({ fn, timeout })
  }

export const beforeAll = addHook('beforeAll')
export const afterAll = addHook('afterAll')
export const beforeEach = addHook('beforeEach')
export const afterEach = addHook('afterEach')

const collectChildren = async (parent: SuiteNode): Promise<void> => {
  for (const child of parent.children) {
    if (child.type !== 'suite') continue
    current = child
    await child.factory?.()
    await collectChildren(child)
  }
}

export const collectFile = async (
  load: () => unknown
): Promise<{ readonly root: SuiteNode; readonly error: unknown }> => {
  const root = makeSuite('', 'run')
  current = root
  try {
    await load()
    await collectChildren(root)
    return { root, error: undefined }
  } catch (error) {
    return { root, error }
  } finally {
    current = undefined
  }
}
