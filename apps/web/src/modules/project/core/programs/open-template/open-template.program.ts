import { validateTemplate } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ProjectTemplateInvalidError } from '../../domain/errors/project-template-invalid.error.ts'
import { modifiedPathsOf, projectFilesOf, type TemplateProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'
import { TemplateSourcePort } from '../../ports/template-source.port.ts'

export const openTemplateProgram = (name: string) =>
  Effect.gen(function* () {
    const source = yield* TemplateSourcePort
    const storage = yield* ProjectStoragePort
    const files = yield* source.load(name)
    const { manifest, tourSteps } = yield* validateTemplate(files).pipe(
      Effect.mapError(
        (error) =>
          new ProjectTemplateInvalidError({ name, issues: error._tag === 'ManifestInvalidError' ? error.issues : [] })
      )
    )
    const templateFiles = projectFilesOf(files)
    const stored = yield* storage.findByTemplate(name).pipe(Effect.orElseSucceed(() => Option.none()))
    const projectFiles = Option.match(stored, { onNone: () => templateFiles, onSome: (project) => project.files })
    return {
      templateName: name,
      manifest,
      tourSteps,
      files: projectFiles,
      templateFiles,
      modifiedPaths: modifiedPathsOf(templateFiles, projectFiles),
    } satisfies TemplateProject
  })
