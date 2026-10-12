import * as Effect from 'effect/Effect'

import { ProjectTemplateNotFoundError } from '../../domain/errors/project-template-not-found.error.ts'
import { projectFilesOf, type BaseTemplate } from '../../domain/project.domain-model.ts'
import { entryForRef } from '../../domain/template-entry.domain-model.ts'
import { TemplateFilesPort } from '../../ports/template-files.port.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'

export const openBaseProgram = (base: { readonly template: string; readonly focus?: ReadonlyArray<string> }) =>
  Effect.gen(function* () {
    const index = yield* TemplateIndexPort
    const source = yield* TemplateFilesPort
    const entry = entryForRef(yield* index.entries, base.template)
    if (entry === undefined) return yield* new ProjectTemplateNotFoundError({ name: base.template })
    const files = yield* source.load(entry.ref)
    return { name: entry.name, files: projectFilesOf(files), focus: base.focus } satisfies BaseTemplate
  })
