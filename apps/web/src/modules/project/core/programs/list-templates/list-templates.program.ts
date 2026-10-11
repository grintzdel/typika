import * as Effect from 'effect/Effect'

import { TemplateSourcePort } from '../../ports/template-source.port.ts'

export const listTemplatesProgram = Effect.gen(function* () {
  const source = yield* TemplateSourcePort
  return yield* source.names
})
