import { useAtom, useAtomRefresh, useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import { runProjectAtom, runtimeSessionAtom, testProjectAtom } from '../../core/atoms/runtime.atoms.ts'
import { EMPTY_CONSOLE, type ConsoleState } from '../../core/domain/console.domain-model.ts'
import type { FileWrite } from '../../core/domain/file-write.domain-model.ts'
import { describeCause } from '../../core/domain/runtime-error-data.ts'
import { EMPTY_TEST_RUN, type TestRunState } from '../../core/domain/test-run.domain-model.ts'

export type SandboxRuntimeStatus = 'loading' | 'ready' | 'failed'

const reasonOf = <A, E>(result: AsyncResult.AsyncResult<A, E>) =>
  Option.match(AsyncResult.error(result), { onNone: () => 'unknown', onSome: describeCause })

const latest = <A, E>(result: AsyncResult.AsyncResult<A, E>, onFailure: (reason: string) => A): A | undefined => {
  const value = Option.getOrUndefined(AsyncResult.value(result))
  if (value !== undefined) return value
  return AsyncResult.isFailure(result) ? onFailure(reasonOf(result)) : undefined
}

export const useSandboxRuntime = (templateName: string, takePending: () => ReadonlyArray<FileWrite>) => {
  const session = useAtomValue(runtimeSessionAtom(templateName))
  const retry = useAtomRefresh(templateProjectAtom(templateName))
  const [runResult, run] = useAtom(runProjectAtom(templateName))
  const [testResult, test] = useAtom(testProjectAtom(templateName))

  const status: SandboxRuntimeStatus = AsyncResult.isSuccess(session)
    ? 'ready'
    : AsyncResult.isFailure(session)
      ? 'failed'
      : 'loading'

  return {
    status,
    bootError: status === 'failed' ? reasonOf(session) : undefined,
    console: latest<ConsoleState, unknown>(runResult, (message) => ({
      ...EMPTY_CONSOLE,
      outcome: { _tag: 'Crashed', message },
    })),
    isRunning: AsyncResult.isWaiting(runResult),
    testRun: latest<TestRunState, unknown>(testResult, (message) => ({
      ...EMPTY_TEST_RUN,
      outcome: { _tag: 'Crashed', message },
    })),
    isTesting: AsyncResult.isWaiting(testResult),
    handleRun: () => run(takePending()),
    handleTest: () => test(takePending()),
    handleRetry: retry,
  }
}
