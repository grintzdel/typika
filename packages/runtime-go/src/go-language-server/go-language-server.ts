import {
  RuntimeAssetLoadError,
  RuntimeProcessError,
  type LanguageServer,
  type LanguageServerError,
  type LanguageServerEvent,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'

import type { WorkerFiles } from '../domain/worker-protocol.domain-model.ts'

export type GoplsEvents = {
  readonly onMessage: (message: string) => void
  readonly onExit: (reason: string) => void
}

export type GoplsProcess = {
  readonly send: (message: string) => void
  readonly sync: (files: WorkerFiles) => void
  readonly terminate: () => void
}

export type GoplsSpawn = (files: WorkerFiles, events: GoplsEvents) => Promise<GoplsProcess>

export type GoLanguageServerOptions = {
  readonly rootUri: string
  readonly spawn: GoplsSpawn
  readonly files: () => WorkerFiles
}

export type GoLanguageServer = LanguageServer & { readonly filesChanged: () => void }

type Connection = {
  readonly process: () => Promise<GoplsProcess>
  readonly close: () => void
}

const MAX_RESTARTS = 1

const asLanguageServerError = (cause: unknown): LanguageServerError =>
  cause instanceof RuntimeAssetLoadError || cause instanceof RuntimeProcessError
    ? cause
    : new RuntimeProcessError({ cause })

const terminate = (process: Promise<GoplsProcess>) =>
  void process.then(
    (started) => started.terminate(),
    () => undefined
  )

export const makeGoLanguageServer = ({ rootUri, spawn, files }: GoLanguageServerOptions): GoLanguageServer => {
  let unavailable: RuntimeProcessError | undefined
  let connection: Connection | undefined
  let held: Array<string> = []

  const connect = Stream.callback<LanguageServerEvent, LanguageServerError>((queue) =>
    Effect.gen(function* () {
      if (unavailable !== undefined) {
        Queue.failCauseUnsafe(queue, Cause.fail(unavailable))
        return
      }
      connection?.close()
      let restarts = 0
      let closed = false
      let current: Promise<GoplsProcess>

      const stop = () => {
        closed = true
        terminate(current)
      }

      const start = (): Promise<GoplsProcess> => {
        const started = spawn(files(), {
          onMessage: (message) => {
            if (!closed && current === started) Queue.offerUnsafe(queue, { _tag: 'Message', message })
          },
          onExit: (reason) => {
            if (closed || current !== started) return
            terminate(started)
            if (restarts < MAX_RESTARTS) {
              restarts += 1
              current = start()
              Queue.offerUnsafe(queue, { _tag: 'Restarted' })
              return
            }
            unavailable = new RuntimeProcessError({ cause: `gopls stopped ${restarts + 1} times: ${reason}` })
            stop()
            Queue.failCauseUnsafe(queue, Cause.fail(unavailable))
          },
        })
        started.catch((cause: unknown) => {
          if (closed || current !== started) return
          stop()
          Queue.failCauseUnsafe(queue, Cause.fail(asLanguageServerError(cause)))
        })
        return started
      }

      current = start()
      const waiting = held
      held = []
      void current.then(
        (process) => waiting.forEach(process.send),
        () => undefined
      )
      const own: Connection = {
        process: () => current,
        close: () => {
          stop()
          Queue.endUnsafe(queue)
        },
      }
      connection = own
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          stop()
          if (connection === own) connection = undefined
        })
      )
    })
  )

  return {
    rootUri,
    connect,
    send: (message) =>
      Effect.suspend(() => {
        if (unavailable !== undefined) return Effect.fail(unavailable)
        const open = connection
        if (open === undefined) return Effect.sync(() => void held.push(message))
        return Effect.tryPromise({
          try: () => open.process().then((process) => process.send(message)),
          catch: (cause) => new RuntimeProcessError({ cause }),
        })
      }),
    filesChanged: () => {
      void connection?.process().then(
        (process) => process.sync(files()),
        () => undefined
      )
    },
  }
}
