import * as Comlink from 'comlink'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { EditorLanguageServiceError } from '../domain/errors/editor-language-service.error.ts'
import type { LanguageServiceFiles } from '../domain/language-service.domain-model.ts'
import { LanguageServicePort, type LanguageServiceSession } from '../ports/language-service.port.ts'
import type { LanguageServiceWorkerApi } from './language-service-worker/language-service.worker.ts'

const spawn = Effect.acquireRelease(
  Effect.sync(
    () =>
      new Worker(new URL('./language-service-worker/language-service.worker.ts', import.meta.url), {
        type: 'module',
        name: 'typika-language-service',
      })
  ),
  (worker) => Effect.sync(() => worker.terminate())
)

const crashOf = (worker: Worker) =>
  Effect.callback<never, EditorLanguageServiceError>((resume) => {
    const onError = (event: ErrorEvent) => resume(Effect.fail(new EditorLanguageServiceError({ cause: event.message })))
    worker.addEventListener('error', onError)
    return Effect.sync(() => worker.removeEventListener('error', onError))
  })

const call = <A>(request: () => Promise<A>) =>
  Effect.tryPromise({ try: request, catch: (cause) => new EditorLanguageServiceError({ cause }) })

const sessionOf = (remote: Comlink.Remote<LanguageServiceWorkerApi>): LanguageServiceSession => ({
  updateFile: (path, content) => call(() => remote.updateFile(path, content)),
  diagnostics: (path) => call(() => remote.diagnostics(path)),
  completions: (path, position) => call(() => remote.completions(path, position)),
  completionChanges: (path, position, item) => call(() => remote.completionChanges(path, position, item)),
  quickInfo: (path, position) => call(() => remote.quickInfo(path, position)),
  signatureHelp: (path, position) => call(() => remote.signatureHelp(path, position)),
})

const start = (files: LanguageServiceFiles) =>
  Effect.gen(function* () {
    const worker = yield* spawn
    const remote = Comlink.wrap<LanguageServiceWorkerApi>(worker)
    yield* Effect.raceFirst(
      call(() => remote.open(files)),
      crashOf(worker)
    )
    return sessionOf(remote)
  })

export const LanguageServiceWorkerLayer = Layer.succeed(LanguageServicePort, { start })
