import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { collectTypeScriptLibraries } from '../../../../vite/typescript-libraries.ts'
import { makeTypeScriptProject } from './adapters/language-service-worker/typescript-project.ts'
import type { LanguageServiceFiles, TypeScriptProject } from './domain/language-service.domain-model.ts'
import { LanguageServicePort, type LanguageServiceSession } from './ports/language-service.port.ts'

export type InMemoryLanguageService = {
  readonly started: ReadonlyArray<LanguageServiceFiles>
  readonly layer: Layer.Layer<LanguageServicePort>
}

const sessionOf = (project: TypeScriptProject): LanguageServiceSession => ({
  updateFile: (path, content) => Effect.sync(() => project.updateFile(path, content)),
  diagnostics: (path) => Effect.sync(() => project.diagnostics(path)),
  completions: (path, position) => Effect.sync(() => project.completions(path, position)),
  completionChanges: (path, position, item) => Effect.sync(() => project.completionChanges(path, position, item)),
  quickInfo: (path, position) => Effect.sync(() => project.quickInfo(path, position)),
  signatureHelp: (path, position) => Effect.sync(() => project.signatureHelp(path, position)),
})

let libraries: LanguageServiceFiles | undefined

export const makeLanguageServiceInMemory = (): InMemoryLanguageService => {
  const started: Array<LanguageServiceFiles> = []
  const layer = Layer.succeed(LanguageServicePort, {
    start: (files) =>
      Effect.sync(() => {
        started.push(files)
        libraries ??= collectTypeScriptLibraries()
        return sessionOf(makeTypeScriptProject({ libraries, files }))
      }),
  })
  return { started, layer }
}
