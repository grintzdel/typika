import { exerciseStates, validateTemplate, type Manifest, type TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ProjectExerciseNotFoundError } from '../../domain/errors/project-exercise-not-found.error.ts'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error.ts'
import { ProjectTemplateInvalidError } from '../../domain/errors/project-template-invalid.error.ts'
import { ProjectTemplateNotFoundError } from '../../domain/errors/project-template-not-found.error.ts'
import {
  modifiedPathsOf,
  originOfKey,
  projectFilesOf,
  projectIdOfKey,
  textOf,
  type ProjectExercise,
  type ProjectFiles,
  type TemplateProject,
} from '../../domain/project.domain-model.ts'
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

export const openTemplateProgram = (key: string) =>
  Effect.gen(function* () {
    const index = yield* TemplateIndexPort
    const source = yield* TemplateFilesPort
    const projectId = projectIdOfKey(key)
    const stored = yield* storedProjectOf(key, projectId)
    const origin = Option.match(stored, { onNone: () => originOfKey(key), onSome: (project) => project.record.origin })
    const { name } = origin
    const entries = yield* index.entries
    const entry = entryNamed(entries, name)
    if (entry === undefined) return yield* new ProjectTemplateNotFoundError({ name })
    const ref = Option.match(stored, { onNone: () => entry.ref, onSome: (project) => project.record.ref ?? entry.ref })
    const files = yield* source.load(ref)
    const { manifest, tourSteps } = yield* validateTemplate(files).pipe(
      Effect.mapError(
        (error) =>
          new ProjectTemplateInvalidError({ name, issues: error._tag === 'ManifestInvalidError' ? error.issues : [] })
      )
    )
    const opened: { readonly start: ProjectFiles; readonly exercise: ProjectExercise | undefined } =
      origin.kind === 'exercise'
        ? yield* openExercise(name, manifest, files, origin.exercise, entries)
        : { start: projectFilesOf(files), exercise: undefined }
    const templateFiles = opened.start
    const projectFiles = Option.match(stored, { onNone: () => templateFiles, onSome: (project) => project.files })
    return {
      projectId,
      templateName: name,
      ref,
      origin,
      exercise: opened.exercise,
      manifest,
      tourSteps,
      files: projectFiles,
      templateFiles,
      modifiedPaths: modifiedPathsOf(templateFiles, projectFiles),
      health: entry.health,
    } satisfies TemplateProject
  })
