type Timer = {
  readonly id: number
  callAt: number
  readonly callback: Function
  readonly args: ReadonlyArray<unknown>
  readonly interval: number | undefined
}

const LOOP_LIMIT = 10_000

const real = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  Date: globalThis.Date,
}

const timers = new Map<number, Timer>()
let installed = false
let clock = 0
let nextId = 1

const toCallback = (handler: unknown): Function => {
  if (typeof handler !== 'function') throw new TypeError('Fake timers only accept a function callback')
  return handler
}

const schedule = (handler: unknown, delay: unknown, args: ReadonlyArray<unknown>, repeat: boolean) => {
  const ms = Math.max(Number(delay) || 0, repeat ? 1 : 0)
  const id = nextId
  nextId += 1
  timers.set(id, { id, callAt: clock + ms, callback: toCallback(handler), args, interval: repeat ? ms : undefined })
  return id
}

const cancel = (id: unknown) => {
  timers.delete(Number(id))
}

const nextTimer = (limit = Infinity): Timer | undefined => {
  let next: Timer | undefined
  for (const timer of timers.values()) {
    if (timer.callAt > limit) continue
    if (next === undefined || timer.callAt < next.callAt || (timer.callAt === next.callAt && timer.id < next.id)) {
      next = timer
    }
  }
  return next
}

const fire = (timer: Timer) => {
  clock = Math.max(clock, timer.callAt)
  if (timer.interval === undefined) timers.delete(timer.id)
  else timer.callAt += timer.interval
  Reflect.apply(timer.callback, undefined, timer.args)
}

class FakeDate extends real.Date {
  constructor(...args: ConstructorParameters<DateConstructor> | []) {
    if (args.length === 0) super(clock)
    else super(...args)
  }

  static override now() {
    return clock
  }
}

const assertInstalled = () => {
  if (!installed) throw new Error('Timers are not mocked. Try calling "vi.useFakeTimers()" first.')
}

export const useFakeTimers = () => {
  if (!installed) clock = real.Date.now()
  installed = true
  Object.assign(globalThis, {
    setTimeout: (handler: unknown, delay?: unknown, ...args: Array<unknown>) => schedule(handler, delay, args, false),
    setInterval: (handler: unknown, delay?: unknown, ...args: Array<unknown>) => schedule(handler, delay, args, true),
    clearTimeout: cancel,
    clearInterval: cancel,
    Date: FakeDate,
  })
}

export const useRealTimers = () => {
  installed = false
  timers.clear()
  Object.assign(globalThis, real)
}

export const isFakeTimers = () => installed

export const advanceTimersByTime = (ms: number) => {
  assertInstalled()
  const target = clock + ms
  for (let count = 0; count < LOOP_LIMIT; count += 1) {
    const timer = nextTimer(target)
    if (timer === undefined) break
    fire(timer)
  }
  clock = target
}

export const advanceTimersToNextTimer = () => {
  assertInstalled()
  const timer = nextTimer()
  if (timer !== undefined) fire(timer)
}

export const runAllTimers = () => {
  assertInstalled()
  for (let count = 0; count < LOOP_LIMIT; count += 1) {
    const timer = nextTimer()
    if (timer === undefined) return
    fire(timer)
  }
  throw new Error(`Aborting after running ${LOOP_LIMIT} timers, assuming an infinite loop!`)
}

export const runOnlyPendingTimers = () => {
  assertInstalled()
  const pending = [...timers.values()].toSorted((a, b) => a.callAt - b.callAt || a.id - b.id)
  for (const timer of pending) {
    if (timers.has(timer.id)) fire(timer)
  }
}

export const getTimerCount = () => timers.size

export const clearAllTimers = () => {
  timers.clear()
}

export const setSystemTime = (time: number | string | Date) => {
  clock = new real.Date(time).getTime()
}

export const getRealSystemTime = () => real.Date.now()
