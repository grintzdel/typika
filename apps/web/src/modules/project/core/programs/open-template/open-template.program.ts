import { exerciseStates, validateTemplate, type Manifest, type TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ProjectExerciseNotFoundError } from '../../domain/errors/project-exercise-not-found.error.ts'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error.ts'
import { ProjectTemplateInvalidError } from '../../domain/errors/project-template-invalid.error.ts'
import { ProjectTemplateNotFoundError } from '../../domain/errors/project-template-not-found.error.ts'
import { ShareLinkInvalidError } from '../../domain/errors/share-link-invalid.error.ts'
import {
  exerciseOf,
  modifiedPathsOf,
  originOfKey,
  projectFilesOf,
  projectIdOfKey,
  sharedPayloadOfKey,
  textOf,
  type ProjectExercise,
  type ProjectFiles,
  type TemplateProject,
} from '../../domain/project.domain-model.ts'
import {
  applyShareDelta,
  decodeSharePayload,
  filesOfShare,
  shareProjectIdOf,
} from '../../domain/share-link.domain-model.ts'
import { entryForRef, entryNamed, type TemplateEntry } from '../../domain/template-entry.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'
import { TemplateFilesPort } from '../../ports/template-files.port.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'

const textAt = (files: TemplateFiles, path: string): string => {
  const content = files.get(path)
  return content === undefined ? '' : textOf(content)
}

const loadBase = (entries: ReadonlyArray<TemplateEntry>, ref: string) =>
  Effect.gen(function* () {
    const source = yield* TemplateFilesPort
    const entry = entryForRef(entries, ref)
    if (entry === undefined) return yield* new ProjectTemplateNotFoundError({ name: ref })
    return yield* source.load(entry.ref)
  })

const openExercise = (
  name: string,
  manifest: Manifest,
  files: TemplateFiles,
  exerciseName: string,
  entries: ReadonlyArray<TemplateEntry>
) =>
  Effect.gen(function* () {
    const exercise = manifest.exercises.find((candidate) => candidate.name === exerciseName)
    if (exercise === undefined) return yield* new ProjectExerciseNotFoundError({ name, exercise: exerciseName })
    const base =
      exercise.from === 'base' && manifest.base !== undefined
        ? yield* loadBase(entries, manifest.base.template)
        : undefined
    const states = yield* exerciseStates({ template: files, base, exercise }).pipe(
      Effect.mapError(() => new ProjectTemplateInvalidError({ name, issues: [] }))
    )
    const folder = `exercises/${exercise.name}/`
    return {
      start: projectFilesOf(states.start),
      exercise: {
        name: exercise.name,
        kind: exercise.kind,
        title: exercise.title,
        failing: exercise.failing,
        readme: textAt(files, `${folder}README.md`),
        hints: exercise.hints.map((hint) => textAt(files, `${folder}${hint}`)),
        solutionFiles: projectFilesOf(states.solution),
      } satisfies ProjectExercise,
    }
  })

const storedProjectOf = (key: string, projectId: string | undefined) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    if (projectId === undefined)
      return yield* storage.findByOrigin(originOfKey(key)).pipe(Effect.orElseSucceed(() => Option.none()))
    const found = yield* storage.findById(projectId)
    if (Option.isNone(found)) return yield* new ProjectNotFoundError({ id: projectId })
    return found
  })

const loadTemplate = (
  name: string,
  ref: string,
  exerciseName: string | undefined,
  entries: ReadonlyArray<TemplateEntry>
) =>
  Effect.gen(function* () {
    const source = yield* TemplateFilesPort
    const files = yield* source.load(ref)
    const { manifest, tourSteps } = yield* validateTemplate(files).pipe(
      Effect.mapError(
        (error) =>
          new ProjectTemplateInvalidError({ name, issues: error._tag === 'ManifestInvalidError' ? error.issues : [] })
      )
    )
    const opened: { readonly start: ProjectFiles; readonly exercise: ProjectExercise | undefined } =
      exerciseName === undefined
        ? { start: projectFilesOf(files), exercise: undefined }
        : yield* openExercise(name, manifest, files, exerciseName, entries)
    return { manifest, tourSteps, templateFiles: opened.start, exercise: opened.exercise }
  })

const openSharedProject = (encoded: string) =>
  Effect.gen(function* () {
    const index = yield* TemplateIndexPort
    const storage = yield* ProjectStoragePort
    const payload = yield* decodeSharePayload(encoded)
    const projectId = yield* shareProjectIdOf(encoded)
    const stored = yield* storage.findById(projectId).pipe(Effect.orElseSucceed(() => Option.none()))
    const entries = yield* index.entries
    const entry = payload.o === undefined ? undefined : entryForRef(entries, payload.o)
    if (payload.o === undefined || entry === undefined) return yield* new ShareLinkInvalidError({ reason: 'origin' })
    const ref = payload.o
    const loaded = yield* loadTemplate(entry.name, ref, payload.x, entries)
    const sharedFiles =
      payload.f === undefined ? applyShareDelta(loaded.templateFiles, payload.d ?? {}) : filesOfShare(payload.f)
    const files = Option.match(stored, { onNone: () => sharedFiles, onSome: (project) => project.files })
    return {
      ...loaded,
      projectId,
      name: Option.match(stored, { onNone: () => payload.n, onSome: (project) => project.record.name }),
      templateName: entry.name,
      ref,
      origin:
        payload.x === undefined
          ? { kind: 'share-url', name: entry.name }
          : { kind: 'share-url', name: entry.name, exercise: payload.x },
      isShared: true,
      isSaved: Option.isSome(stored),
      files,
      modifiedPaths: modifiedPathsOf(loaded.templateFiles, files),
      health: entry.health,
    } satisfies TemplateProject
  })

export const openTemplateProgram = (key: string) =>
  Effect.gen(function* () {
    const encoded = sharedPayloadOfKey(key)
    if (encoded !== undefined) return yield* openSharedProject(encoded)
    const index = yield* TemplateIndexPort
    const projectId = projectIdOfKey(key)
    const stored = yield* storedProjectOf(key, projectId)
    const origin = Option.match(stored, { onNone: () => originOfKey(key), onSome: (project) => project.record.origin })
    const { name } = origin
    const entries = yield* index.entries
    const entry = entryNamed(entries, name)
    if (entry === undefined) return yield* new ProjectTemplateNotFoundError({ name })
    const ref = Option.match(stored, { onNone: () => entry.ref, onSome: (project) => project.record.ref ?? entry.ref })
    const loaded = yield* loadTemplate(name, ref, exerciseOf(origin), entries)
    const files = Option.match(stored, { onNone: () => loaded.templateFiles, onSome: (project) => project.files })
    return {
      ...loaded,
      projectId,
      name: Option.match(stored, { onNone: () => name, onSome: (project) => project.record.name }),
      templateName: name,
      ref,
      origin,
      isShared: origin.kind === 'share-url',
      isSaved: Option.isSome(stored),
      files,
      modifiedPaths: modifiedPathsOf(loaded.templateFiles, files),
      health: entry.health,
    } satisfies TemplateProject
  })
