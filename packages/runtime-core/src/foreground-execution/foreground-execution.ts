import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Queue from 'effect/Queue'
import type * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'

import { RuntimeTimeoutError } from '../domain/errors/runtime-timeout.error.ts'
import type { RuntimeExecutionError } from '../domain/runtime.port.ts'

export type ForegroundBody<A> = (
  queue: Queue.Queue<A, RuntimeExecutionError | Cause.Done>
) => Effect.Effect<unknown, RuntimeExecutionError, Scope.Scope>

export const makeForegroundExecution = () => {
  let preemptCurrent: (() => void) | undefined

  return <A>(limitMs: number, body: ForegroundBody<A>): Stream.Stream<A, RuntimeExecutionError> =>
    Stream.callback<A, RuntimeExecutionError>((queue) =>
      Effect.gen(function* () {
        preemptCurrent?.()
        const preempt = () => Queue.failCauseUnsafe(queue, Cause.interrupt())
        preemptCurrent = preempt
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            if (preemptCurrent === preempt) preemptCurrent = undefined
          })
        )
        yield* Effect.forkScoped(
          Effect.sleep(limitMs).pipe(Effect.andThen(Queue.fail(queue, new RuntimeTimeoutError({ limitMs }))))
        )
        yield* body(queue)
      })
    )
}
