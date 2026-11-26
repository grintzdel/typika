import type { Language } from '@typika/manifest'
import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'

import { ProjectTemplateNotFoundError } from '../../domain/errors/project-template-not-found.error.ts'
import { blankProjectFiles, personalOriginOf, personalTemplateOf } from '../../domain/personal-project.domain-model.ts'
import { projectFilesOf, type ProjectFiles } from '../../domain/project.domain-model.ts'
import { entryNamed } from '../../domain/template-entry.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'
import { TemplateFilesPort } from '../../ports/template-files.port.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'

export const createPersonalProjectProgram = ({
  name,
  files,
  ref,
}: {
  readonly name: string
  readonly files: ProjectFiles
  readonly ref?: string | undefined
}) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const { manifest } = yield* personalTemplateOf(files, name)
    const now = yield* Clock.currentTimeMillis
    const id = yield* Effect.sync(() => crypto.randomUUID())
    yield* storage.saveTemplateEdits({
      project: {
        id,
        name,
        origin: personalOriginOf(manifest),
        ...(ref === undefined ? {} : { ref }),
        baseline: Object.fromEntries(files),
        createdAt: now,
        updatedAt: now,
      },
      initialFiles: files,
      edits: new Map(),
      match: 'id',
    })
    return id
  })

export const createBlankProjectProgram = ({ name, language }: { readonly name: string; readonly language: Language }) =>
  createPersonalProjectProgram({ name, files: blankProjectFiles({ name, language }) })

export const copyTemplateProgram = ({ template, name }: { readonly template: string; readonly name: string }) =>
  Effect.gen(function* () {
    const index = yield* TemplateIndexPort
    const source = yield* TemplateFilesPort
    const entry = entryNamed(yield* index.entries, template)
    if (entry === undefined) return yield* new ProjectTemplateNotFoundError({ name: template })
    const files = projectFilesOf(yield* source.load(entry.ref))
    return yield* createPersonalProjectProgram({ name, files, ref: entry.ref })
  })
