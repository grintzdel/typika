import type { RuntimeKind } from '@typika/manifest'
import {
  ProcessOutputSchema,
  RuntimeAssetLoadError,
  RuntimeBootError,
  RuntimeFsError,
  RuntimeProcessError,
  TestEventSchema,
  type ProjectPath,
  type ProjectSnapshot,
  type RuntimeExecutionError,
  type RuntimeSession,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'

import { fromRuntimeErrorData, type RuntimeError } from '../domain/runtime-error-data.ts'
import {
  FrameResponseSchema,
  RuntimeLoadProgressSchema,
  type FrameRequest,
  type FrameResponse,
} from '../domain/runtime-frame-protocol.domain-model.ts'
import type { RuntimeFrameBootError, RuntimeFrameLoadError, RuntimeFramePort } from '../ports/runtime-frame.port.ts'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type Request = DistributiveOmit<FrameRequest, 'id'>

const decodeResponse = Schema.decodeUnknownOption(FrameResponseSchema)

const filesOf = (snapshot: ProjectSnapshot) => [...snapshot.files.entries()]

const asExecutionError = (error: RuntimeError): RuntimeExecutionError => {
  switch (error._tag) {
    case 'RuntimeCompileError':
    case 'RuntimeProcessError':
    case 'RuntimeTimeoutError':
    case 'KotlinCompilerRateLimitedError':
    case 'KotlinCompilerUnavailableError':
      return error
    default:
      return new RuntimeProcessError({ cause: error })
  }
}

const asLoadError =
  (kind: RuntimeKind) =>
  (error: RuntimeError): RuntimeFrameLoadError => {
    switch (error._tag) {
      case 'RuntimeAssetLoadError':
      case 'RuntimeUnsupportedError':
        return error
      default:
        return new RuntimeAssetLoadError({ asset: kind, cause: error })
    }
  }

const asFsError = (path: ProjectPath) => (error: RuntimeError) =>
  error._tag === 'RuntimeFsError' ? error : new RuntimeFsError({ path, reason: error._tag })

export const makeRuntimeFrameClient = (port: MessagePort): Context.Service.Shape<typeof RuntimeFramePort> => {
  const listeners = new Map<number, (response: FrameResponse) => void>()
  let nextId = 0

  port.addEventListener('message', (event: MessageEvent<unknown>) =>
    Option.match(decodeResponse(event.data), {
      onNone: () => console.warn('Ignored a malformed runtime frame message', event.data),
      onSome: (response) => listeners.get(response.id)?.(response),
    })
  )
  port.start()

  const send = (id: number, request: Request) => port.postMessage({ ...request, id })

  const callAs = (id: number, request: Request) =>
    Effect.callback<void, RuntimeError>((resume) => {
      listeners.set(id, (response) => {
        if (response._tag === 'Succeeded') resume(Effect.void)
        else if (response._tag === 'Failed') resume(Effect.fail(fromRuntimeErrorData(response.error)))
        else return
        listeners.delete(id)
      })
      send(id, request)
      return Effect.sync(() => listeners.delete(id))
    })

  const call = (request: Request) => Effect.suspend(() => callAs(nextId++, request))

  const stream = <A, E>(request: Request, schema: Schema.Codec<A, unknown>, asError: (error: RuntimeError) => E) => {
    const decodeItem = Schema.decodeUnknownOption(schema)
    return Stream.callback<A, E>((queue) =>
      Effect.gen(function* () {
        const id = nextId++
        let settled = false
        listeners.set(id, (response) => {
          if (response._tag === 'Emitted') {
            Option.match(decodeItem(response.item), {
              onNone: () => console.warn('Ignored a malformed runtime item', response.item),
              onSome: (item) => Queue.offerUnsafe(queue, item),
            })
            return
          }
          settled = true
          if (response._tag === 'Ended') Queue.endUnsafe(queue)
          if (response._tag === 'Interrupted') Queue.failCauseUnsafe(queue, Cause.interrupt())
          if (response._tag === 'Failed')
            Queue.failCauseUnsafe(queue, Cause.fail(asError(fromRuntimeErrorData(response.error))))
        })
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            listeners.delete(id)
            if (!settled) send(nextId++, { _tag: 'Interrupt', target: id })
          })
        )
        send(id, request)
      })
    )
  }

  const makeSession = (): RuntimeSession => ({
    fs: {
      writeFile: (path, content) => call({ _tag: 'WriteFile', path, content }).pipe(Effect.mapError(asFsError(path))),
      deleteFile: (path) => call({ _tag: 'DeleteFile', path }).pipe(Effect.mapError(asFsError(path))),
      rename: (from, to) => call({ _tag: 'Rename', from, to }).pipe(Effect.mapError(asFsError(from))),
      sync: (snapshot) =>
        call({ _tag: 'Sync', files: filesOf(snapshot) }).pipe(
          Effect.mapError((error) => new RuntimeFsError({ path: '', reason: error._tag }))
        ),
    },
    run: (command) =>
      stream({ _tag: 'Run', command: command.command, args: command.args }, ProcessOutputSchema, asExecutionError),
    test: (options) => stream({ _tag: 'Test', ...options }, TestEventSchema, asExecutionError),
    preview: Effect.succeed(Option.none()),
  })

  return {
    load: (kind) => stream({ _tag: 'Load', kind }, RuntimeLoadProgressSchema, asLoadError(kind)),
    boot: (snapshot) => {
      const bootId = nextId++
      return Effect.acquireRelease(
        callAs(bootId, { _tag: 'Boot', files: filesOf(snapshot) }).pipe(
          Effect.mapError((error): RuntimeFrameBootError => {
            switch (error._tag) {
              case 'RuntimeBootError':
              case 'RuntimeAssetLoadError':
              case 'RuntimeUnsupportedError':
                return error
              default:
                return new RuntimeBootError({ kind: snapshot.manifest.runtime.kind, cause: error })
            }
          }),
          Effect.as(makeSession())
        ),
        () => call({ _tag: 'Shutdown', boot: bootId }).pipe(Effect.ignore)
      )
    },
  }
}
