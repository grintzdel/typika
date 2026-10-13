import type { TestFailure, TestLocation } from '@typika/runtime-core'

import type { MapStack } from '../map-stack/map-stack.ts'

const ASSERTION_ERROR = 'AssertionError'
const EXPECTED_ACTUAL = /Expected <(.*)>, actual <(.*)>\.$/s

type Thrown = { readonly name: string; readonly message: string; readonly stack: string }

const simpleNameOf = (error: object): string => {
  const constructor: unknown = Reflect.get(error, 'constructor')
  if (typeof constructor !== 'function') return 'Error'
  const metadata: unknown = Reflect.get(constructor, '$metadata$')
  const simpleName: unknown =
    typeof metadata === 'object' && metadata !== null ? Reflect.get(metadata, 'simpleName') : undefined
  return typeof simpleName === 'string' ? simpleName : constructor.name || 'Error'
}

const thrownOf = (error: unknown): Thrown => {
  if (typeof error !== 'object' || error === null) return { name: 'Error', message: String(error), stack: '' }
  const message: unknown = Reflect.get(error, 'message')
  const stack: unknown = Reflect.get(error, 'stack')
  return {
    name: simpleNameOf(error),
    message: typeof message === 'string' ? message : '',
    stack: typeof stack === 'string' ? stack : '',
  }
}

export const headlineOf = (error: unknown): string => {
  const thrown = thrownOf(error)
  if (thrown.name === ASSERTION_ERROR) return thrown.message
  return thrown.message === '' ? thrown.name : `${thrown.name}: ${thrown.message}`
}

const formatStack = (headline: string, frames: ReadonlyArray<TestLocation>) =>
  [headline, ...frames.map((frame) => `    at ${frame.file}:${frame.line}:${frame.column ?? 0}`)].join('\n')

export const describeKotlinError = (error: unknown, mapStack: MapStack, testFile?: string): TestFailure => {
  const headline = headlineOf(error)
  const frames = mapStack(thrownOf(error).stack)
  const location = frames.find((frame) => frame.file === testFile) ?? frames[0]
  const values = EXPECTED_ACTUAL.exec(headline)
  return {
    message: headline,
    ...(values === null ? {} : { expected: values[1] ?? '', actual: values[2] ?? '' }),
    ...(frames.length === 0 ? {} : { stack: formatStack(headline, frames) }),
    ...(location === undefined ? {} : { location }),
  }
}

export const formatUncaught = (error: unknown, mapStack: MapStack): string =>
  `Exception in thread "main" ${formatStack(headlineOf(error), mapStack(thrownOf(error).stack))}\n`
