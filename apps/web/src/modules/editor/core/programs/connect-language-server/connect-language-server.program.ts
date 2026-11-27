import type { LanguageServer, ProjectSnapshot } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import { LanguageServicePort } from '../../ports/language-service.port.ts'

export const connectLanguageServerProgram = (server: LanguageServer, snapshot: ProjectSnapshot) =>
  Effect.flatMap(LanguageServicePort, (languageService) =>
    languageService.connect(
      server,
      Object.fromEntries(
        [...snapshot.files].filter((entry): entry is [(typeof entry)[0], string] => typeof entry[1] === 'string')
      )
    )
  )
