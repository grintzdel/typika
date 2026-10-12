import { useAtom, useAtomRefresh, useAtomValue } from '@effect/atom-react'
import type { Diagnostic } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'
import { useState } from 'react'

import { templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import {
  runProjectAtom,
  runtimeDownloadAtom,
  runtimeSessionAtom,
  testProjectAtom,
} from '../../core/atoms/runtime.atoms.ts'
import { EMPTY_CONSOLE, type ConsoleState } from '../../core/domain/console.domain-model.ts'
import type { FileWrite } from '../../core/domain/file-write.domain-model.ts'
import { describeCause } from '../../core/domain/runtime-error-data.ts'
import { EMPTY_TEST_RUN, type TestRunState } from '../../core/domain/test-run.domain-model.ts'

export type SandboxRuntimeStatus = 'loading' | 'ready' | 'failed'

const reasonOf = <A, E>(result: AsyncResult.AsyncResult<A, E>) =>
  Option.match(AsyncResult.error(result), { onNone: () => 'unknown', onSome: describeCause })

const NO_DIAGNOSTICS: ReadonlyArray<Diagnostic> = []

const latest = <A extends { readonly outcome: unknown }, E>(
  result: AsyncResult.AsyncResult<A, E>,
  empty: A,
  onFailure: (reason: string) => A['outcome']
): A | undefined => {
  const value = Option.getOrUndefined(AsyncResult.value(result))
  if (AsyncResult.isFailure(result) && Cause.hasInterruptsOnly(result.cause))
    return { ...(value ?? empty), outcome: { _tag: 'Interrupted' } }
  if (value !== undefined) return value
  return AsyncResult.isFailure(result) ? { ...empty, outcome: onFailure(reasonOf(result)) } : undefined
}

export const useSandboxRuntime = (templateName: string, takePending: () => ReadonlyArray<FileWrite>) => {
  const session = useAtomValue(runtimeSessionAtom(templateName))
  const retry = useAtomRefresh(templateProjectAtom(templateName))
  const [runResult, run] = useAtom(runProjectAtom(templateName))
  const [testResult, test] = useAtom(testProjectAtom(templateName))
  const download = Option.getOrUndefined(AsyncResult.value(useAtomValue(runtimeDownloadAtom(templateName))))
  const [lastAction, setLastAction] = useState<'run' | 'test'>('run')

  const status: SandboxRuntimeStatus = AsyncResult.isSuccess(session)
    ? 'ready'
    : AsyncResult.isFailure(session)
      ? 'failed'
      : 'loading'

  const consoleState = latest<ConsoleState, unknown>(runResult, EMPTY_CONSOLE, (message) => ({
    _tag: 'Crashed',
    message,
  }))
  const testRunState = latest<TestRunState, unknown>(testResult, EMPTY_TEST_RUN, (message) => ({
    _tag: 'Crashed',
    message,
  }))

  return {
    status,
    bootError: status === 'failed' ? reasonOf(session) : undefined,
    download,
    console: consoleState,
    isRunning: AsyncResult.isWaiting(runResult),
    testRun: testRunState,
    isTesting: AsyncResult.isWaiting(testResult),
    diagnostics: (lastAction === 'run' ? consoleState?.diagnostics : testRunState?.diagnostics) ?? NO_DIAGNOSTICS,
    handleRun: () => {
      setLastAction('run')
      run(takePending())
    },
    handleTest: () => {
      setLastAction('test')
      test(takePending())
    },
    handleStop: () => {
      run(Atom.Interrupt)
      test(Atom.Interrupt)
    },
    handleRetry: retry,
  }
}
