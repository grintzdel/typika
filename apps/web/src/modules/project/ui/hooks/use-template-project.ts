import { useAtom, useAtomRefresh, useAtomSet, useAtomValue } from '@effect/atom-react'
import type { FileContent } from '@typika/runtime-core'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import type { RegistryIndexFailure } from '../../../shared/core/domain/constants/registry-index-failure.constant.ts'
import {
  applySolutionAtom,
  embeddedTemplatesAtom,
  resetProjectAtom,
  saveProjectFilesAtom,
  templateProjectAtom,
} from '../../core/atoms/project.atoms.ts'
import { ProjectExerciseNotFoundError } from '../../core/domain/errors/project-exercise-not-found.error.ts'
import { ProjectFilesUnavailableError } from '../../core/domain/errors/project-files-unavailable.error.ts'
import { ProjectIndexUnavailableError } from '../../core/domain/errors/project-index-unavailable.error.ts'
import { ProjectNotFoundError } from '../../core/domain/errors/project-not-found.error.ts'
import { ProjectTemplateInvalidError } from '../../core/domain/errors/project-template-invalid.error.ts'
import { ProjectTemplateNotFoundError } from '../../core/domain/errors/project-template-not-found.error.ts'
import { ShareLinkInvalidError } from '../../core/domain/errors/share-link-invalid.error.ts'
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import { textOf, type ProjectFileEdit } from '../../core/domain/project.domain-model.ts'

export type OpenTemplateFailure =
  | { readonly _tag: 'NotFound'; readonly name: string }
  | { readonly _tag: 'Invalid'; readonly name: string }
  | { readonly _tag: 'ExerciseNotFound'; readonly name: string; readonly exercise: string }
  | { readonly _tag: 'IndexUnavailable'; readonly failure: RegistryIndexFailure }
  | { readonly _tag: 'FilesUnavailable'; readonly name: string }
  | { readonly _tag: 'ProjectNotFound'; readonly id: string }
  | { readonly _tag: 'ShareInvalid'; readonly reason: ShareLinkInvalidError['reason'] }
  | { readonly _tag: 'Unknown'; readonly name: string }

export const openTemplateFailureOf = <A, E>(
  result: AsyncResult.AsyncResult<A, E>,
  templateName: string
): OpenTemplateFailure | undefined => {
  if (!AsyncResult.isFailure(result) || AsyncResult.isWaiting(result)) return undefined
  const error: unknown = Option.getOrUndefined(AsyncResult.error(result))
  if (error instanceof ProjectTemplateNotFoundError) return { _tag: 'NotFound', name: error.name }
  if (error instanceof ProjectTemplateInvalidError) return { _tag: 'Invalid', name: error.name }
  if (error instanceof ProjectExerciseNotFoundError)
    return { _tag: 'ExerciseNotFound', name: error.name, exercise: error.exercise }
  if (error instanceof ProjectIndexUnavailableError) return { _tag: 'IndexUnavailable', failure: error.failure }
  if (error instanceof ShareLinkInvalidError) return { _tag: 'ShareInvalid', reason: error.reason }
  if (error instanceof ProjectNotFoundError) return { _tag: 'ProjectNotFound', id: error.id }
  if (error instanceof ProjectFilesUnavailableError) return { _tag: 'FilesUnavailable', name: templateName }
  return { _tag: 'Unknown', name: templateName }
}

const currentFiles = (files: ReadonlyMap<string, FileContent>): ReadonlyMap<string, string> =>
  new Map([...files].map(([path, content]) => [path, textOf(content)]))

export const useTemplateProject = (templateName: string) => {
  const result = useAtomValue(templateProjectAtom(templateName))
  const [saveResult, save] = useAtom(saveProjectFilesAtom(templateName))
  const reset = useAtomSet(resetProjectAtom(templateName))
  const applySolution = useAtomSet(applySolutionAtom(templateName))
  const refresh = useAtomRefresh(templateProjectAtom(templateName))
  const embeddedTemplates = Option.getOrElse(AsyncResult.value(useAtomValue(embeddedTemplatesAtom)), () => [])

  const failure = openTemplateFailureOf(result, templateName)

  const opened = Option.getOrUndefined(AsyncResult.value(result))
  const files: ReadonlyMap<string, FileContent> = opened?.files ?? new Map()

  const template =
    opened === undefined
      ? undefined
      : {
          name: opened.templateName,
          title: opened.manifest.title,
          exercise: opened.exercise,
          isShared: opened.isShared,
          health: opened.health,
          exercises: opened.manifest.exercises.map(({ name, title, kind }) => ({ name, title, kind })),
          entry: opened.manifest.runtime.entry,
          runtime: opened.manifest.runtime.kind,
          generation: opened.generation,
          tourSteps: opened.tourSteps,
          tree: buildFileTree(opened.files.keys()),
          contentOf: (path: string) => {
            const content = files.get(path)
            return content === undefined ? '' : textOf(content)
          },
          files: currentFiles(opened.files),
          templateFiles: opened.templateFiles as ReadonlyMap<string, string>,
          originalOf: (path: string) => (opened.templateFiles as ReadonlyMap<string, string>).get(path),
        }

  return {
    template,
    failure,
    embeddedTemplates,
    isLoading: template === undefined && failure === undefined,
    modifiedPaths: Option.getOrElse(AsyncResult.value(saveResult), () => opened?.modifiedPaths ?? []),
    saveFailed: AsyncResult.isFailure(saveResult),
    isSaved: opened?.isSaved === true || AsyncResult.isSuccess(saveResult),
    handleSave: (edits: ReadonlyArray<ProjectFileEdit>) => save(edits),
    handleSaveShared: () => save([]),
    handleReset: () => reset(),
    handleApplySolution: () => applySolution(),
    handleRetry: () => refresh(),
  }
}
