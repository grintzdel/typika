import { exerciseStates, validateTemplate, type Manifest, type TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { GitHubGistPort } from '../../../../github/core/ports/github-gist.port.ts'
import { GitHubSessionPort } from '../../../../github/core/ports/github-session.port.ts'
import { GistUnavailableError } from '../../domain/errors/gist-unavailable.error.ts'
import { ProjectExerciseNotFoundError } from '../../domain/errors/project-exercise-not-found.error.ts'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error.ts'
import { ProjectTemplateInvalidError } from '../../domain/errors/project-template-invalid.error.ts'
import { ProjectTemplateNotFoundError } from '../../domain/errors/project-template-not-found.error.ts'
import { ShareLinkInvalidError } from '../../domain/errors/share-link-invalid.error.ts'
import { projectOfGistFiles } from '../../domain/gist-share.domain-model.ts'
import { personalOriginOf, personalTemplateOf } from '../../domain/personal-project.domain-model.ts'
import {
  embedTemplateOfKey,
  exerciseOf,
  gistIdOfKey,
  gistProjectKeyOf,
  modifiedPathsOf,
  originOfKey,
  projectFilesOf,
  projectFilesOfRecord,
  projectIdOfKey,
  sharedPayloadOfKey,
  textOf,
  type ProjectExercise,
  type ProjectFiles,
  type ProjectOrigin,
  type StoredProject,
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

const openPersonalProject = ({ record, files }: StoredProject) =>
  Effect.gen(function* () {
    const templateFiles = projectFilesOfRecord(record.baseline ?? {})
    const template = yield* personalTemplateOf(templateFiles, record.name)
    return {
      ...template,
      templateFiles,
      exercise: undefined,
      projectId: record.id,
      name: record.name,
      templateName: template.manifest.name,
      ref: record.ref ?? '',
      origin: record.origin,
      isShared: false,
      isSaved: true,
      files,
      modifiedPaths: modifiedPathsOf(templateFiles, files),
      health: undefined,
    } satisfies TemplateProject
  })

type SharedSource = {
  readonly projectId: string
  readonly name: string
  readonly ref: string | undefined
  readonly exercise: string | undefined
  readonly originOf: (templateName: string) => ProjectOrigin
  readonly filesOf: (templateFiles: ProjectFiles) => ProjectFiles
  readonly personalFiles: ProjectFiles | undefined
}

const openSharedPersonal = <E>(projectId: string, name: string, templateFiles: ProjectFiles, notProject: E) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const stored = yield* storage.findById(projectId).pipe(Effect.orElseSucceed(() => Option.none()))
    const template = yield* personalTemplateOf(templateFiles, name).pipe(Effect.mapError(() => notProject))
    const files = Option.match(stored, { onNone: () => templateFiles, onSome: (project) => project.files })
    return {
      ...template,
      templateFiles,
      exercise: undefined,
      projectId,
      name: Option.match(stored, { onNone: () => name, onSome: (project) => project.record.name }),
      templateName: template.manifest.name,
      ref: '',
      origin: personalOriginOf(template.manifest),
      isShared: true,
      isSaved: Option.isSome(stored),
      files,
      modifiedPaths: modifiedPathsOf(templateFiles, files),
      health: undefined,
    } satisfies TemplateProject
  })

const openShared = <E>(
  { projectId, name, ref, exercise, originOf, filesOf, personalFiles }: SharedSource,
  originNotFound: E
) =>
  Effect.gen(function* () {
    const index = yield* TemplateIndexPort
    const storage = yield* ProjectStoragePort
    const stored = yield* storage.findById(projectId).pipe(Effect.orElseSucceed(() => Option.none()))
    const entries = ref === undefined ? [] : yield* index.entries
    const entry = ref === undefined ? undefined : entryForRef(entries, ref)
    if (ref === undefined || entry === undefined)
      return yield* personalFiles === undefined
        ? Effect.fail(originNotFound)
        : openSharedPersonal(projectId, name, personalFiles, originNotFound)
    const loaded = yield* loadTemplate(entry.name, ref, exercise, entries)
    const files = Option.match(stored, {
      onNone: () => filesOf(loaded.templateFiles),
      onSome: (project) => project.files,
    })
    return {
      ...loaded,
      projectId,
      name: Option.match(stored, { onNone: () => name, onSome: (project) => project.record.name }),
      templateName: entry.name,
      ref,
      origin: originOf(entry.name),
      isShared: true,
      isSaved: Option.isSome(stored),
      files,
      modifiedPaths: modifiedPathsOf(loaded.templateFiles, files),
      health: entry.health,
    } satisfies TemplateProject
  })

const openSharedProject = (encoded: string) =>
  Effect.gen(function* () {
    const payload = yield* decodeSharePayload(encoded)
    return yield* openShared(
      {
        projectId: yield* shareProjectIdOf(encoded),
        name: payload.n,
        ref: payload.o,
        exercise: payload.x,
        originOf: (name) => ({ kind: 'share-url', name, ...(payload.x === undefined ? {} : { exercise: payload.x }) }),
        filesOf: (templateFiles) =>
          payload.f === undefined ? applyShareDelta(templateFiles, payload.d ?? {}) : filesOfShare(payload.f),
        personalFiles: payload.f === undefined ? undefined : filesOfShare(payload.f),
      },
      new ShareLinkInvalidError({ reason: 'origin' })
    )
  })

const openGistProject = (gistId: string) =>
  Effect.gen(function* () {
    const gists = yield* GitHubGistPort
    const sessions = yield* GitHubSessionPort
    const accessToken = Option.getOrUndefined(yield* sessions.session)?.accessToken
    const gist = yield* gists.get(gistId, accessToken).pipe(
      Effect.catchIf(
        (error) => error.reason === 'unauthorized',
        () => gists.get(gistId, undefined)
      ),
      Effect.mapError(
        ({ reason }) =>
          new GistUnavailableError({
            reason:
              reason === 'not-found' || reason === 'rate-limited' || reason === 'invalid' ? reason : 'unavailable',
          })
      )
    )
    if (gist.isTruncated) return yield* new GistUnavailableError({ reason: 'invalid' })
    const shared = yield* projectOfGistFiles(gist.files)
    return yield* openShared(
      {
        projectId: yield* shareProjectIdOf(gistProjectKeyOf(gistId)),
        name: shared.name,
        ref: shared.ref,
        exercise: shared.exercise,
        originOf: (name) => ({
          kind: 'gist',
          name,
          gistId,
          ...(shared.exercise === undefined ? {} : { exercise: shared.exercise }),
        }),
        filesOf: () => shared.files,
        personalFiles: shared.files,
      },
      new GistUnavailableError({ reason: 'origin' })
    )
  })

export const openTemplateProgram = (key: string) =>
  Effect.gen(function* () {
    const encoded = sharedPayloadOfKey(key)
    if (encoded !== undefined) return yield* openSharedProject(encoded)
    const gistId = gistIdOfKey(key)
    if (gistId !== undefined) return yield* openGistProject(gistId)
    const index = yield* TemplateIndexPort
    const projectId = projectIdOfKey(key)
    const embedded = embedTemplateOfKey(key)
    const stored = embedded === undefined ? yield* storedProjectOf(key, projectId) : Option.none()
    if (Option.isSome(stored) && stored.value.record.origin.kind === 'personal')
      return yield* openPersonalProject(stored.value)
    const origin = Option.match(stored, {
      onNone: () => originOfKey(embedded ?? key),
      onSome: (project) => project.record.origin,
    })
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
      isShared: origin.kind === 'share-url' || origin.kind === 'gist',
      isSaved: Option.isSome(stored),
      files,
      modifiedPaths: modifiedPathsOf(loaded.templateFiles, files),
      health: entry.health,
    } satisfies TemplateProject
  })
