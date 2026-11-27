import * as Comlink from 'comlink'
import * as Effect from 'effect/Effect'

import { EditorLanguageServiceError } from '../domain/errors/editor-language-service.error.ts'
import { EditorOutdatedError } from '../domain/errors/editor-outdated.error.ts'
import type { LanguageServiceFiles } from '../domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../ports/language-service.port.ts'
import type { LanguageServiceWorkerApi } from './language-service-worker/language-service.worker.ts'
// oxlint-disable-next-line import/default -- Vite gives a ?worker&url import the built worker's URL
import languageServiceWorkerUrl from './language-service-worker/language-service.worker.ts?worker&url'

const spawn = Effect.acquireRelease(
  Effect.sync(() => new Worker(languageServiceWorkerUrl, { type: 'module', name: 'typika-language-service' })),
  (worker) => Effect.sync(() => worker.terminate())
)

const isWorkerGone = Effect.tryPromise(() =>
  fetch(languageServiceWorkerUrl, { method: 'HEAD', cache: 'no-store' })
).pipe(
  Effect.map((response) => response.status === 404),
  Effect.orElseSucceed(() => false)
)

const crashOf = (worker: Worker) =>
  Effect.callback<string>((resume) => {
    const onError = (event: ErrorEvent) => resume(Effect.succeed(event.message))
    worker.addEventListener('error', onError)
    return Effect.sync(() => worker.removeEventListener('error', onError))
  }).pipe(
    Effect.flatMap((message) =>
      Effect.flatMap(isWorkerGone, (isGone) =>
        Effect.fail(isGone ? new EditorOutdatedError() : new EditorLanguageServiceError({ cause: message }))
      )
    )
  )

const call = <A>(request: () => Promise<A>) =>
  Effect.tryPromise({ try: request, catch: (cause) => new EditorLanguageServiceError({ cause }) })

const sessionOf = (remote: Comlink.Remote<LanguageServiceWorkerApi>): LanguageServiceSession => ({
  updateFile: (path, content) => call(() => remote.updateFile(path, content)),
  removeFile: (path) => call(() => remote.removeFile(path)),
  diagnostics: (path) => call(() => remote.diagnostics(path)),
  projectDiagnostics: () => call(() => remote.projectDiagnostics()),
  completions: (path, position) => call(() => remote.completions(path, position)),
  completionChanges: (path, position, item) => call(() => remote.completionChanges(path, position, item)),
  completionDetails: (path, position, item) => call(() => remote.completionDetails(path, position, item)),
  quickInfo: (path, position) => call(() => remote.quickInfo(path, position)),
  signatureHelp: (path, position) => call(() => remote.signatureHelp(path, position)),
  definition: (path, position) => call(() => remote.definition(path, position)),
  references: (path, position) => call(() => remote.references(path, position)),
  rename: (path, position, newName) => call(() => remote.rename(path, position, newName)),
})

export const startTypeScriptLanguageService = (files: LanguageServiceFiles) =>
  Effect.gen(function* () {
    const worker = yield* spawn
    const remote = Comlink.wrap<LanguageServiceWorkerApi>(worker)
    yield* Effect.raceFirst(
      call(() => remote.open(files)),
      crashOf(worker)
    )
    return sessionOf(remote)
  })
