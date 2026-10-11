import { MANIFEST_FILE, parseManifest, RuntimeKind } from '@typika/manifest'
import {
  RuntimeBootError,
  RuntimeFsError,
  RuntimeProcessError,
  type FileContent,
  type ProjectPath,
  type ProjectSnapshot,
  type RuntimeRegistry,
  type RuntimeSession,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Schema from 'effect/Schema'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'

import { toRuntimeErrorData, type RuntimeError } from '../domain/runtime-error-data.ts'
import {
  FrameRequestSchema,
  type FrameRequest,
  type FrameResponse,
} from '../domain/runtime-frame-protocol.domain-model.ts'

type Files = ReadonlyArray<readonly [ProjectPath, FileContent]>
type Current = { readonly bootId: number; readonly session: RuntimeSession; readonly scope: Scope.Closeable }

const decodeRequest = Schema.decodeUnknownOption(FrameRequestSchema)

const noSession = (path: string) => () => new RuntimeFsError({ path, reason: 'No runtime session' })

const snapshotOf = (files: Files): Effect.Effect<ProjectSnapshot, RuntimeBootError> => {
  const source = files.find(([path]) => path === MANIFEST_FILE)?.[1]
  return parseManifest(typeof source === 'string' ? source : new TextDecoder().decode(source)).pipe(
    Effect.map((manifest) => ({ files: new Map(files), manifest })),
    Effect.mapError((cause) => new RuntimeBootError({ kind: RuntimeKind.BROWSER_JS, cause }))
  )
}

export const serveRuntimeFrame = (
  port: MessagePort,
  registry: Context.Service.Shape<typeof RuntimeRegistry>
): Effect.Effect<never, never, Scope.Scope> =>
  Effect.gen(function* () {
    const inbox = yield* Queue.unbounded<unknown>()
    const listener = (event: MessageEvent<unknown>) => Queue.offerUnsafe(inbox, event.data)
    port.addEventListener('message', listener)
    port.start()
    yield* Effect.addFinalizer(() => Effect.sync(() => port.removeEventListener('message', listener)))

    let current: Current | undefined
    const running = new Map<number, Fiber.Fiber<unknown, unknown>>()
    const reply = (response: FrameResponse) => port.postMessage(response)

    const shutdown = Effect.suspend(() => {
      const closing = current
      current = undefined
      return closing === undefined ? Effect.void : Scope.close(closing.scope, Exit.void)
    })

    const withSession = <A>(
      onMissing: () => RuntimeError,
      use: (session: RuntimeSession) => Effect.Effect<A, RuntimeError>
    ) => (current === undefined ? Effect.fail(onMissing()) : use(current.session))

    const shutdownBoot = (bootId: number) => (current?.bootId === bootId ? shutdown : Effect.void)

    const boot = (bootId: number, files: Files) =>
      Effect.gen(function* () {
        yield* shutdown
        const snapshot = yield* snapshotOf(files)
        const runtime = yield* registry.get(snapshot.manifest.runtime.kind)
        const scope = yield* Scope.make()
        const session = yield* Scope.provide(scope)(runtime.boot(snapshot)).pipe(
          Effect.onError(() => Scope.close(scope, Exit.void))
        )
        current = { bootId, session, scope }
      })

    const forward = <A>(id: number, stream: (session: RuntimeSession) => Stream.Stream<A, RuntimeError>) =>
      Effect.gen(function* () {
        if (current === undefined) {
          reply({ _tag: 'Failed', id, error: { _tag: 'RuntimeProcessError', cause: 'No runtime session' } })
          return
        }
        const fiber = yield* Stream.runForEach(stream(current.session), (item) =>
          Effect.sync(() => reply({ _tag: 'Emitted', id, item }))
        ).pipe(
          Effect.onExit((exit) =>
            Effect.sync(() => {
              running.delete(id)
              const error = Exit.isSuccess(exit) ? Option.none() : Cause.findErrorOption(exit.cause)
              if (Exit.isSuccess(exit)) reply({ _tag: 'Ended', id })
              else if (Option.isSome(error)) reply({ _tag: 'Failed', id, error: toRuntimeErrorData(error.value) })
              else if (Cause.hasInterruptsOnly(exit.cause)) reply({ _tag: 'Interrupted', id })
              else
                reply({
                  _tag: 'Failed',
                  id,
                  error: { _tag: 'RuntimeProcessError', cause: Cause.pretty(exit.cause) },
                })
            })
          ),
          Effect.forkIn(current.scope)
        )
        running.set(id, fiber)
      })

    const acknowledge = (id: number, effect: Effect.Effect<void, RuntimeError>) =>
      effect.pipe(
        Effect.matchEffect({
          onSuccess: () => Effect.sync(() => reply({ _tag: 'Succeeded', id })),
          onFailure: (error) => Effect.sync(() => reply({ _tag: 'Failed', id, error: toRuntimeErrorData(error) })),
        })
      )

    const handle = (request: FrameRequest): Effect.Effect<void> => {
      switch (request._tag) {
        case 'Boot':
          return acknowledge(request.id, boot(request.id, request.files))
        case 'WriteFile':
          return acknowledge(
            request.id,
            withSession(noSession(request.path), (session) => session.fs.writeFile(request.path, request.content))
          )
        case 'DeleteFile':
          return acknowledge(
            request.id,
            withSession(noSession(request.path), (session) => session.fs.deleteFile(request.path))
          )
        case 'Rename':
          return acknowledge(
            request.id,
            withSession(noSession(request.from), (session) => session.fs.rename(request.from, request.to))
          )
        case 'Sync':
          return acknowledge(
            request.id,
            snapshotOf(request.files).pipe(
              Effect.mapError((error) => new RuntimeProcessError({ cause: error.cause })),
              Effect.flatMap((snapshot) => withSession(noSession(''), (session) => session.fs.sync(snapshot)))
            )
          )
        case 'Run':
          return forward(request.id, (session) => session.run({ command: request.command, args: request.args }))
        case 'Test':
          return forward(request.id, (session) =>
            session.test({
              ...(request.files === undefined ? {} : { files: request.files }),
              ...(request.namePattern === undefined ? {} : { namePattern: request.namePattern }),
            })
          )
        case 'Interrupt': {
          const fiber = running.get(request.target)
          return fiber === undefined ? Effect.void : Fiber.interrupt(fiber)
        }
        default:
          return acknowledge(request.id, shutdownBoot(request.boot))
      }
    }

    yield* Effect.addFinalizer(() => shutdown)

    return yield* Effect.forever(
      Queue.take(inbox).pipe(
        Effect.flatMap((data) =>
          Option.match(decodeRequest(data), {
            onNone: () => Effect.logWarning('Ignored a malformed runtime frame request', data),
            onSome: handle,
          })
        )
      )
    )
  })
