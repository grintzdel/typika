import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { describe, expect, it } from 'vitest'

import { RuntimeTimeoutError } from '../domain/errors/runtime-timeout.error.ts'
import { makeForegroundExecution } from './foreground-execution.ts'

const forever = Effect.never

describe('makeForegroundExecution', () => {
  it('streams what the body offers until it ends the queue', async () => {
    const execute = makeForegroundExecution()
    const items = await Effect.runPromise(
      Stream.runCollect(
        execute<number>(1_000, (queue) =>
          Effect.sync(() => {
            Queue.offerAllUnsafe(queue, [1, 2])
            Queue.endUnsafe(queue)
          })
        )
      )
    )
    expect(items).toEqual([1, 2])
  })

  it('fails with a timeout once the limit is over', async () => {
    const execute = makeForegroundExecution()
    const exit = await Effect.runPromiseExit(Stream.runCollect(execute<number>(20, () => forever)))
    expect(Exit.isFailure(exit) && Cause.findErrorOption(exit.cause)).toMatchObject({
      value: new RuntimeTimeoutError({ limitMs: 20 }),
    })
  })

  it('interrupts the running execution when another one starts', async () => {
    const execute = makeForegroundExecution()
    const exit = await Effect.runPromise(
      Effect.gen(function* () {
        const first = yield* Effect.forkChild(Stream.runCollect(execute<number>(1_000, () => forever)))
        yield* Effect.sleep(10)
        yield* Stream.runCollect(execute<number>(1_000, (queue) => Effect.sync(() => Queue.endUnsafe(queue))))
        return yield* Fiber.await(first)
      })
    )
    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
  })

  it('runs the finalizers of the body when the consumer stops', async () => {
    const execute = makeForegroundExecution()
    let finalized = false
    await Effect.runPromise(
      Stream.runCollect(
        execute<number>(1_000, (queue) =>
          Effect.gen(function* () {
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                finalized = true
              })
            )
            Queue.offerUnsafe(queue, 1)
            return yield* forever
          })
        ).pipe(Stream.take(1))
      )
    )
    expect(finalized).toBe(true)
  })
})
