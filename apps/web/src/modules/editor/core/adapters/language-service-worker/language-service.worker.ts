import * as Comlink from 'comlink'
import libraries from 'virtual:typika/typescript-libraries'

import type { LanguageServiceFiles, TypeScriptProject } from '../../domain/language-service.domain-model.ts'
import { makeTypeScriptProject } from './typescript-project.ts'

let project: TypeScriptProject | undefined

const opened = () => {
  if (project === undefined) throw new Error('The language service has no project open')
  return project
}

const api = {
  open: (files: LanguageServiceFiles) => {
    project = makeTypeScriptProject({ libraries, files })
  },
  updateFile: (path: string, content: string) => opened().updateFile(path, content),
  diagnostics: (path: string) => opened().diagnostics(path),
  completions: (path: string, position: number) => opened().completions(path, position),
  completionChanges: (...args: Parameters<TypeScriptProject['completionChanges']>) =>
    opened().completionChanges(...args),
  quickInfo: (path: string, position: number) => opened().quickInfo(path, position),
  signatureHelp: (path: string, position: number) => opened().signatureHelp(path, position),
}

export type LanguageServiceWorkerApi = typeof api

Comlink.expose(api)
