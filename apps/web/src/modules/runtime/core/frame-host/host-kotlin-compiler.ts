import { KotlinCompilerUnavailableError } from '@typika/runtime-core'
import type { KotlinCompilerClient, KotlinCompilerError } from '@typika/runtime-kotlin'
import * as Effect from 'effect/Effect'

import { fromRuntimeErrorData } from '../domain/runtime-error-data.ts'
import type { FrameRequest, FrameResponse } from '../domain/runtime-frame-protocol.domain-model.ts'

type CompileReply = Extract<FrameRequest, { readonly _tag: 'KotlinCompiled' | 'KotlinCompileFailed' }>

export type HostKotlinCompiler = {
  readonly compiler: KotlinCompilerClient
  readonly attach: (send: (call: FrameResponse) => void) => void
  readonly settle: (reply: CompileReply) => void
}

const asCompilerError = (
  reply: Extract<CompileReply, { readonly _tag: 'KotlinCompileFailed' }>
): KotlinCompilerError => {
  const error = fromRuntimeErrorData(reply.error)
  return error._tag === 'KotlinCompilerRateLimitedError' || error._tag === 'KotlinCompilerUnavailableError'
    ? error
    : new KotlinCompilerUnavailableError({ cause: error })
}

export const makeHostKotlinCompiler = (): HostKotlinCompiler => {
  let send: ((call: FrameResponse) => void) | undefined
  const pending = new Map<number, (reply: CompileReply) => void>()
  let nextCallId = 0

  return {
    attach: (sender) => {
      send = sender
    },
    settle: (reply) => pending.get(reply.callId)?.(reply),
    compiler: {
      compile: (mode, files) =>
        Effect.callback((resume) => {
          if (send === undefined) {
            resume(Effect.fail(new KotlinCompilerUnavailableError({ cause: 'The runtime frame has no host' })))
            return Effect.void
          }
          const callId = nextCallId++
          pending.set(callId, (reply) => {
            pending.delete(callId)
            resume(
              reply._tag === 'KotlinCompiled' ? Effect.succeed(reply.compilation) : Effect.fail(asCompilerError(reply))
            )
          })
          send({ _tag: 'CompileKotlin', callId, mode, files })
          return Effect.sync(() => pending.delete(callId))
        }),
    },
  }
}
