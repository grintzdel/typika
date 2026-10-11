import type { TemplateFiles, TourStep } from '@typika/manifest'
import { ProjectPathSchema, type FileContent, type ProjectPath, type ProjectSnapshot } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

export const ProjectOriginSchema = Schema.Struct({
  kind: Schema.Literal('template'),
  name: Schema.String,
})

export const ProjectRecordSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  origin: ProjectOriginSchema,
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
})
export type ProjectRecord = Schema.Schema.Type<typeof ProjectRecordSchema>

export const StoredFileSchema = Schema.Struct({
  projectId: Schema.String,
  path: ProjectPathSchema,
  content: Schema.String,
  updatedAt: Schema.Number,
})
export type StoredFile = Schema.Schema.Type<typeof StoredFileSchema>

export type ProjectFiles = ReadonlyMap<ProjectPath, string>
export type ProjectFileEdit = readonly [ProjectPath, string]

export type StoredProject = {
  readonly record: ProjectRecord
  readonly files: ProjectFiles
}

export type TemplateProject = ProjectSnapshot & {
  readonly templateName: string
  readonly tourSteps: ReadonlyArray<TourStep>
  readonly templateFiles: ProjectFiles
  readonly modifiedPaths: ReadonlyArray<ProjectPath>
}

export const textOf = (content: FileContent): string =>
  typeof content === 'string' ? content : new TextDecoder().decode(content)

const EXERCISES_DIR = 'exercises/'
const toProjectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const projectFilesOf = (files: TemplateFiles): ProjectFiles =>
  new Map(
    [...files]
      .filter(([path]) => !path.startsWith(EXERCISES_DIR))
      .map(([path, content]) => [toProjectPath(path), textOf(content)])
  )

export type BaseTemplate = {
  readonly name: string
  readonly files: ProjectFiles
  readonly focus: ReadonlyArray<string> | undefined
}

export const modifiedPathsOf = (template: ProjectFiles, current: ProjectFiles): ReadonlyArray<ProjectPath> =>
  [...new Set([...template.keys(), ...current.keys()])]
    .filter((path) => template.get(path) !== current.get(path))
    .toSorted()
