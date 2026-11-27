import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { collectTypeScriptLibraries } from '../../../../vite/typescript-libraries.ts'
import { makeTypeScriptProject } from './adapters/language-service-worker/typescript-project.ts'
import type { LanguageServiceFiles, TypeScriptProject } from './domain/language-service.domain-model.ts'
import { LanguageServicePort, type LanguageServiceSession } from './ports/language-service.port.ts'

export type InMemoryLanguageService = {
  readonly started: ReadonlyArray<LanguageServiceFiles>
  readonly connected: ReadonlyArray<{ readonly rootUri: string; readonly files: LanguageServiceFiles }>
  readonly layer: Layer.Layer<LanguageServicePort>
}

const sessionOf = (project: TypeScriptProject): LanguageServiceSession => ({
  updateFile: (path, content) => Effect.sync(() => project.updateFile(path, content)),
  removeFile: (path) => Effect.sync(() => project.removeFile(path)),
  diagnostics: (path) => Effect.sync(() => project.diagnostics(path)),
  projectDiagnostics: () => Effect.sync(() => project.projectDiagnostics()),
  completions: (path, position) => Effect.sync(() => project.completions(path, position)),
  completionChanges: (path, position, item) => Effect.sync(() => project.completionChanges(path, position, item)),
  completionDetails: (path, position, item) => Effect.sync(() => project.completionDetails(path, position, item)),
  quickInfo: (path, position) => Effect.sync(() => project.quickInfo(path, position)),
  signatureHelp: (path, position) => Effect.sync(() => project.signatureHelp(path, position)),
  definition: (path, position) => Effect.sync(() => project.definition(path, position)),
  references: (path, position) => Effect.sync(() => project.references(path, position)),
  rename: (path, position, newName) => Effect.sync(() => project.rename(path, position, newName)),
})

let libraries: LanguageServiceFiles | undefined

export const makeLanguageServiceSessionInMemory = (files: LanguageServiceFiles): LanguageServiceSession => {
  libraries ??= collectTypeScriptLibraries()
  return sessionOf(makeTypeScriptProject({ libraries, files }))
}

export const makeLanguageServiceInMemory = (): InMemoryLanguageService => {
  const started: Array<LanguageServiceFiles> = []
  const connected: Array<{ readonly rootUri: string; readonly files: LanguageServiceFiles }> = []
  const sessionFor = (files: LanguageServiceFiles) => {
    libraries ??= collectTypeScriptLibraries()
    return sessionOf(makeTypeScriptProject({ libraries, files }))
  }
  const layer = Layer.succeed(LanguageServicePort, {
    start: (files) =>
      Effect.sync(() => {
        started.push(files)
        return sessionFor(files)
      }),
    connect: (server, files) =>
      Effect.sync(() => {
        connected.push({ rootUri: server.rootUri, files })
        return sessionFor(files)
      }),
  })
  return { started, connected, layer }
}
