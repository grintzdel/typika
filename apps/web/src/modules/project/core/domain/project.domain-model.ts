import { withoutExercises, type ExerciseKind, type Language, type TemplateFiles, type TourStep } from '@typika/manifest'
import { ProjectPathSchema, type FileContent, type ProjectPath, type ProjectSnapshot } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

import type { TemplateEntryHealth } from './template-entry.domain-model.ts'

export const ProjectOriginSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal('template'), name: Schema.String }),
  Schema.Struct({ kind: Schema.Literal('exercise'), name: Schema.String, exercise: Schema.String }),
  Schema.Struct({
    kind: Schema.Literal('share-url'),
    name: Schema.String,
    exercise: Schema.optionalKey(Schema.String),
  }),
])
export type ProjectOrigin = Schema.Schema.Type<typeof ProjectOriginSchema>

const KEY_SEPARATOR = '#'
const STORED_KEY_PREFIX = 'project:'
const SHARED_KEY_PREFIX = 'share:'

export const projectKeyOf = (templateName: string, exercise: string | undefined): string =>
  exercise === undefined ? templateName : `${templateName}${KEY_SEPARATOR}${exercise}`

export const storedProjectKeyOf = (id: string): string => `${STORED_KEY_PREFIX}${id}`

export const projectIdOfKey = (key: string): string | undefined =>
  key.startsWith(STORED_KEY_PREFIX) ? key.slice(STORED_KEY_PREFIX.length) : undefined

export const sharedProjectKeyOf = (encoded: string): string => `${SHARED_KEY_PREFIX}${encoded}`

export const sharedPayloadOfKey = (key: string): string | undefined =>
  key.startsWith(SHARED_KEY_PREFIX) ? key.slice(SHARED_KEY_PREFIX.length) : undefined

export const exerciseOf = (origin: ProjectOrigin): string | undefined =>
  origin.kind === 'template' ? undefined : origin.exercise

export const projectPathOf = (id: string): string => `/p/${id}`

export const originOfKey = (key: string): ProjectOrigin => {
  const [name = key, exercise] = key.split(KEY_SEPARATOR)
  return exercise === undefined ? { kind: 'template', name } : { kind: 'exercise', name, exercise }
}

export const sameOrigin = (a: ProjectOrigin, b: ProjectOrigin): boolean =>
  a.kind === 'share-url' || b.kind === 'share-url'
    ? false
    : a.kind === 'exercise'
      ? b.kind === 'exercise' && a.name === b.name && a.exercise === b.exercise
      : b.kind === 'template' && a.name === b.name

export type ProjectListItem = {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly templateName: string
  readonly templateTitle: string | undefined
  readonly language: Language | undefined
  readonly exercise: string | undefined
  readonly updatedAt: number
}

export type RecentProject = {
  readonly name: string
  readonly exercise: string | undefined
  readonly path: string
  readonly updatedAt: number
}

export const ProjectRecordSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  origin: ProjectOriginSchema,
  ref: Schema.optionalKey(Schema.String),
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

export type ProjectExercise = {
  readonly name: string
  readonly kind: ExerciseKind
  readonly title: string
  readonly failing: ReadonlyArray<string>
  readonly readme: string
  readonly hints: ReadonlyArray<string>
  readonly solutionFiles: ProjectFiles
}

export type TemplateProject = ProjectSnapshot & {
  readonly projectId: string | undefined
  readonly name: string
  readonly isShared: boolean
  readonly isSaved: boolean
  readonly templateName: string
  readonly ref: string
  readonly origin: ProjectOrigin
  readonly exercise: ProjectExercise | undefined
  readonly tourSteps: ReadonlyArray<TourStep>
  readonly templateFiles: ProjectFiles
  readonly modifiedPaths: ReadonlyArray<ProjectPath>
  readonly health: TemplateEntryHealth | undefined
}

export const textOf = (content: FileContent): string =>
  typeof content === 'string' ? content : new TextDecoder().decode(content)

export const textFilesOf = (files: ReadonlyMap<ProjectPath, FileContent>): ProjectFiles =>
  new Map([...files].map(([path, content]) => [path, textOf(content)]))

const toProjectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const projectFilesOf = (files: TemplateFiles): ProjectFiles =>
  new Map([...withoutExercises(files)].map(([path, content]) => [toProjectPath(path), textOf(content)]))

export type BaseTemplate = {
  readonly name: string
  readonly files: ProjectFiles
  readonly focus: ReadonlyArray<string> | undefined
}

export const modifiedPathsOf = (template: ProjectFiles, current: ProjectFiles): ReadonlyArray<ProjectPath> =>
  [...new Set([...template.keys(), ...current.keys()])]
    .filter((path) => template.get(path) !== current.get(path))
    .toSorted()
