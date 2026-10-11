import * as Effect from 'effect/Effect'

import { projectFilesOf, type BaseTemplate } from '../../domain/project.domain-model.ts'
import { TemplateSourcePort } from '../../ports/template-source.port.ts'

export const openBaseProgram = (base: { readonly template: string; readonly focus?: ReadonlyArray<string> }) =>
  Effect.gen(function* () {
    const source = yield* TemplateSourcePort
    const name = yield* source.resolveRef(base.template)
    const files = yield* source.load(name)
    return { name, files: projectFilesOf(files), focus: base.focus } satisfies BaseTemplate
  })
