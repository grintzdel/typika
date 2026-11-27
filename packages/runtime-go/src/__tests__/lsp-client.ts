import { RuntimeProcessError, type LanguageServer } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

type Response = { readonly result?: unknown; readonly error?: unknown }

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

export const connectLspClient = (server: LanguageServer) =>
  Effect.gen(function* () {
    const pending = new Map<number, (response: Response) => void>()
    let nextId = 1

    const send = (message: object) => server.send(JSON.stringify({ jsonrpc: '2.0', ...message }))

    const receive = (raw: string) => {
      const message: unknown = JSON.parse(raw)
      if (!isRecord(message) || typeof message.id !== 'number') return Effect.void
      if (typeof message.method === 'string') return send({ id: message.id, result: null })
      pending.get(message.id)?.(message)
      pending.delete(message.id)
      return Effect.void
    }

    yield* Stream.runForEach(server.connect, (event) =>
      event._tag === 'Message' ? receive(event.message) : Effect.void
    ).pipe(Effect.forkScoped)

    const request = (method: string, params: unknown) =>
      Effect.callback<unknown, RuntimeProcessError>((resume) => {
        const id = nextId++
        pending.set(id, (response) =>
          resume(
            response.error === undefined
              ? Effect.succeed(response.result)
              : Effect.fail(new RuntimeProcessError({ cause: response.error }))
          )
        )
        Effect.runFork(send({ id, method, params }))
      })

    const notify = (method: string, params: unknown) => send({ method, params })

    return { request, notify }
  })
