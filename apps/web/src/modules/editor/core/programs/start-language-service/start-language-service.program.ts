import type { ProjectSnapshot } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import { isLanguageServiceInput } from '../../domain/language-service.domain-model.ts'
import { LanguageServicePort } from '../../ports/language-service.port.ts'

export const startLanguageServiceProgram = (snapshot: ProjectSnapshot) =>
  Effect.flatMap(LanguageServicePort, (languageService) =>
    languageService.start(
      Object.fromEntries(
        [...snapshot.files].filter(
          (entry): entry is [(typeof entry)[0], string] =>
            typeof entry[1] === 'string' && isLanguageServiceInput(entry[0])
        )
      )
    )
  )
