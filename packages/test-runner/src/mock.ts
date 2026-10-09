export type Procedure = (...args: never[]) => unknown

type Implementation<T extends Procedure> = (this: unknown, ...args: Parameters<T>) => ReturnType<T>

export type MockResult =
  | { readonly type: 'return'; readonly value: unknown }
  | { readonly type: 'throw'; readonly value: unknown }

export interface MockState<T extends Procedure> {
  readonly calls: Array<Parameters<T>>
  readonly results: Array<MockResult>
  readonly instances: Array<unknown>
  readonly contexts: Array<unknown>
  readonly lastCall: Parameters<T> | undefined
}

export interface Mock<T extends Procedure = (...args: Array<unknown>) => unknown> {
  (...args: Parameters<T>): ReturnType<T>
  new (...args: Parameters<T>): ReturnType<T>
  readonly mock: MockState<T>
  getMockName(): string
  mockName(name: string): this
  getMockImplementation(): Implementation<T> | undefined
  mockImplementation(implementation: Implementation<T>): this
  mockImplementationOnce(implementation: Implementation<T>): this
  mockReturnValue(value: ReturnType<T>): this
  mockReturnValueOnce(value: ReturnType<T>): this
  mockResolvedValue(value: Awaited<ReturnType<T>>): this
  mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this
  mockRejectedValue(reason: unknown): this
  mockRejectedValueOnce(reason: unknown): this
  mockReturnThis(): this
  mockClear(): this
  mockReset(): this
  mockRestore(): void
}

const MOCK = Symbol.for('typika.mock')

type Registered = { readonly mock: Mock<Procedure>; readonly isSpy: boolean }

const registry = new Set<Registered>()

export const isMockFunction = (value: unknown): value is Mock<Procedure> => typeof value === 'function' && MOCK in value

export const createMock = <T extends Procedure>(
  original: Implementation<T> | undefined,
  defaultName: string,
  restore?: () => void
): Mock<T> => {
  let name = defaultName
  let implementation = original
  let onces: Array<Implementation<T>> = []
  const state = {
    calls: [] as Array<Parameters<T>>,
    results: [] as Array<MockResult>,
    instances: [] as Array<unknown>,
    contexts: [] as Array<unknown>,
    get lastCall() {
      return state.calls.at(-1)
    },
  }

  function mock(this: unknown, ...args: Parameters<T>): unknown {
    state.calls.push(args)
    state.contexts.push(this)
    const current = onces.shift() ?? implementation
    try {
      const value: unknown =
        current === undefined
          ? undefined
          : new.target === undefined
            ? current.apply(this, args)
            : Reflect.construct(current as unknown as new (...args: Parameters<T>) => unknown, args, new.target)
      state.instances.push(new.target === undefined ? this : value)
      state.results.push({ type: 'return', value })
      return value
    } catch (error) {
      state.results.push({ type: 'throw', value: error })
      throw error
    }
  }

  const clear = () => {
    state.calls.length = 0
    state.results.length = 0
    state.instances.length = 0
    state.contexts.length = 0
  }

  const api = Object.assign(mock, {
    [MOCK]: true,
    mock: state,
    getMockName: () => name,
    mockName: (value: string) => {
      name = value
      return api
    },
    getMockImplementation: () => implementation,
    mockImplementation: (value: Implementation<T>) => {
      implementation = value
      return api
    },
    mockImplementationOnce: (value: Implementation<T>) => {
      onces.push(value)
      return api
    },
    mockReturnValue: (value: ReturnType<T>) => api.mockImplementation(() => value),
    mockReturnValueOnce: (value: ReturnType<T>) => api.mockImplementationOnce(() => value),
    mockResolvedValue: (value: Awaited<ReturnType<T>>) =>
      api.mockImplementation(() => Promise.resolve(value) as ReturnType<T>),
    mockResolvedValueOnce: (value: Awaited<ReturnType<T>>) =>
      api.mockImplementationOnce(() => Promise.resolve(value) as ReturnType<T>),
    mockRejectedValue: (reason: unknown) => api.mockImplementation(() => Promise.reject(reason) as ReturnType<T>),
    mockRejectedValueOnce: (reason: unknown) =>
      api.mockImplementationOnce(() => Promise.reject(reason) as ReturnType<T>),
    mockReturnThis: () =>
      api.mockImplementation(function (this: unknown) {
        return this as ReturnType<T>
      }),
    mockClear: () => {
      clear()
      return api
    },
    mockReset: () => {
      clear()
      implementation = original
      onces = []
      return api
    },
    mockRestore: () => {
      api.mockReset()
      restore?.()
    },
  })

  const typed = api as unknown as Mock<T>
  registry.add({ mock: typed, isSpy: restore !== undefined })
  return typed
}

export const fn = <T extends Procedure = (...args: Array<unknown>) => unknown>(implementation?: T): Mock<T> =>
  createMock<T>(implementation as Implementation<T> | undefined, 'vi.fn()')

type MethodKeys<T> = { [K in keyof T]: T[K] extends Procedure ? K : never }[keyof T]

export const spyOn = <T extends object, K extends MethodKeys<T>>(
  object: T,
  method: K
): Mock<T[K] extends Procedure ? T[K] : never> => {
  type Method = T[K] extends Procedure ? T[K] : never
  const original = object[method] as unknown as Method
  if (isMockFunction(original)) return original
  const owned = Object.prototype.hasOwnProperty.call(object, method)
  const spy = createMock<Method>(original as unknown as Implementation<Method>, String(method), () => {
    if (owned) Object.assign(object, { [method]: original })
    else Reflect.deleteProperty(object, method)
  })
  Object.assign(object, { [method]: spy })
  return spy
}

export const clearAllMocks = () => {
  for (const { mock } of registry) mock.mockClear()
}

export const resetAllMocks = () => {
  for (const { mock } of registry) mock.mockReset()
}

export const restoreAllMocks = () => {
  for (const entry of registry) {
    if (!entry.isSpy) continue
    entry.mock.mockRestore()
    registry.delete(entry)
  }
}
