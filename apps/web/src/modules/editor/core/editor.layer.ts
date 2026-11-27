import * as Layer from 'effect/Layer'

import { connectLanguageServer } from './adapters/language-service.lsp.adapter.ts'
import { startTypeScriptLanguageService } from './adapters/language-service.worker.adapter.ts'
import { LanguageServicePort } from './ports/language-service.port.ts'

export const EditorLayer = Layer.succeed(LanguageServicePort, {
  start: startTypeScriptLanguageService,
  connect: connectLanguageServer,
})
