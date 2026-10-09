import {
  advanceTimersByTime,
  advanceTimersToNextTimer,
  clearAllTimers,
  getRealSystemTime,
  getTimerCount,
  isFakeTimers,
  runAllTimers,
  runOnlyPendingTimers,
  setSystemTime,
  useFakeTimers,
  useRealTimers,
} from './fake-timers.ts'
import { clearAllMocks, fn, isMockFunction, resetAllMocks, restoreAllMocks, spyOn } from './mock.ts'

const chain =
  <A extends Array<unknown>>(action: (...args: A) => unknown) =>
  (...args: A): VitestUtils => {
    action(...args)
    return vi
  }

export interface VitestUtils {
  readonly fn: typeof fn
  readonly spyOn: typeof spyOn
  readonly isMockFunction: typeof isMockFunction
  readonly clearAllMocks: () => VitestUtils
  readonly resetAllMocks: () => VitestUtils
  readonly restoreAllMocks: () => VitestUtils
  readonly useFakeTimers: () => VitestUtils
  readonly useRealTimers: () => VitestUtils
  readonly isFakeTimers: () => boolean
  readonly advanceTimersByTime: (ms: number) => VitestUtils
  readonly advanceTimersToNextTimer: () => VitestUtils
  readonly runAllTimers: () => VitestUtils
  readonly runOnlyPendingTimers: () => VitestUtils
  readonly clearAllTimers: () => VitestUtils
  readonly getTimerCount: () => number
  readonly setSystemTime: (time: number | string | Date) => VitestUtils
  readonly getRealSystemTime: () => number
}

export const vi: VitestUtils = {
  fn,
  spyOn,
  isMockFunction,
  clearAllMocks: chain(clearAllMocks),
  resetAllMocks: chain(resetAllMocks),
  restoreAllMocks: chain(restoreAllMocks),
  useFakeTimers: chain(useFakeTimers),
  useRealTimers: chain(useRealTimers),
  isFakeTimers,
  advanceTimersByTime: chain(advanceTimersByTime),
  advanceTimersToNextTimer: chain(advanceTimersToNextTimer),
  runAllTimers: chain(runAllTimers),
  runOnlyPendingTimers: chain(runOnlyPendingTimers),
  clearAllTimers: chain(clearAllTimers),
  getTimerCount,
  setSystemTime: chain(setSystemTime),
  getRealSystemTime,
}
