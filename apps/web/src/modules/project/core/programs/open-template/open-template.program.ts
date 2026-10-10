import { validateTemplate } from '@typika/manifest'
import { ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { ProjectTemplateInvalidError } from '../../domain/errors/project-template-invalid.error.ts'
import type { TemplateProject } from '../../domain/project.domain-model.ts'
import { TemplateSourcePort } from '../../ports/template-source.port.ts'

const EXERCISES_DIR = 'exercises/'
const toProjectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const openTemplateProgram = (name: string) =>
  Effect.gen(function* () {
    const source = yield* TemplateSourcePort
    const files = yield* source.load(name)
    const { manifest } = yield* validateTemplate(files).pipe(
      Effect.mapError(
        (error) =>
          new ProjectTemplateInvalidError({ name, issues: error._tag === 'ManifestInvalidError' ? error.issues : [] })
      )
    )
    return {
      templateName: name,
      manifest,
      files: new Map(
        [...files]
          .filter(([path]) => !path.startsWith(EXERCISES_DIR))
          .map(([path, content]) => [toProjectPath(path), content])
      ),
    } satisfies TemplateProject
  })
