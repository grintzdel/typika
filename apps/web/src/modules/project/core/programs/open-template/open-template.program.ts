import { exerciseStates, validateTemplate, type Manifest, type TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ProjectExerciseNotFoundError } from '../../domain/errors/project-exercise-not-found.error.ts'
import { ProjectTemplateInvalidError } from '../../domain/errors/project-template-invalid.error.ts'
import {
  modifiedPathsOf,
  originOfKey,
  projectFilesOf,
  textOf,
  type ProjectExercise,
  type ProjectFiles,
  type TemplateProject,
} from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'
import { TemplateSourcePort } from '../../ports/template-source.port.ts'

const textAt = (files: TemplateFiles, path: string): string => {
  const content = files.get(path)
  return content === undefined ? '' : textOf(content)
}

const openExercise = (name: string, manifest: Manifest, files: TemplateFiles, exerciseName: string) =>
  Effect.gen(function* () {
    const source = yield* TemplateSourcePort
    const exercise = manifest.exercises.find((candidate) => candidate.name === exerciseName)
    if (exercise === undefined) return yield* new ProjectExerciseNotFoundError({ name, exercise: exerciseName })
    const base =
      exercise.from === 'base' && manifest.base !== undefined
        ? yield* Effect.flatMap(source.resolveRef(manifest.base.template), source.load)
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

export const openTemplateProgram = (key: string) =>
  Effect.gen(function* () {
    const source = yield* TemplateSourcePort
    const storage = yield* ProjectStoragePort
    const origin = originOfKey(key)
    const { name } = origin
    const files = yield* source.load(name)
    const { manifest, tourSteps } = yield* validateTemplate(files).pipe(
      Effect.mapError(
        (error) =>
          new ProjectTemplateInvalidError({ name, issues: error._tag === 'ManifestInvalidError' ? error.issues : [] })
      )
    )
    const opened: { readonly start: ProjectFiles; readonly exercise: ProjectExercise | undefined } =
      origin.kind === 'exercise'
        ? yield* openExercise(name, manifest, files, origin.exercise)
        : { start: projectFilesOf(files), exercise: undefined }
    const templateFiles = opened.start
    const stored = yield* storage.findByOrigin(origin).pipe(Effect.orElseSucceed(() => Option.none()))
    const projectFiles = Option.match(stored, { onNone: () => templateFiles, onSome: (project) => project.files })
    return {
      templateName: name,
      origin,
      exercise: opened.exercise,
      manifest,
      tourSteps,
      files: projectFiles,
      templateFiles,
      modifiedPaths: modifiedPathsOf(templateFiles, projectFiles),
    } satisfies TemplateProject
  })
