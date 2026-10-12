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
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import { textOf, type ProjectFileEdit } from '../../core/domain/project.domain-model.ts'

export type OpenTemplateFailure =
  | { readonly _tag: 'NotFound'; readonly name: string }
  | { readonly _tag: 'Invalid'; readonly name: string }
  | { readonly _tag: 'ExerciseNotFound'; readonly name: string; readonly exercise: string }
  | { readonly _tag: 'IndexUnavailable'; readonly failure: RegistryIndexFailure }
  | { readonly _tag: 'FilesUnavailable'; readonly name: string }
  | { readonly _tag: 'Unknown'; readonly name: string }

const currentFiles = (files: ReadonlyMap<string, FileContent>): ReadonlyMap<string, string> =>
  new Map([...files].map(([path, content]) => [path, textOf(content)]))

export const useTemplateProject = (templateName: string) => {
  const result = useAtomValue(templateProjectAtom(templateName))
  const [saveResult, save] = useAtom(saveProjectFilesAtom(templateName))
  const reset = useAtomSet(resetProjectAtom(templateName))
  const applySolution = useAtomSet(applySolutionAtom(templateName))
  const refresh = useAtomRefresh(templateProjectAtom(templateName))
  const embeddedTemplates = Option.getOrElse(AsyncResult.value(useAtomValue(embeddedTemplatesAtom)), () => [])

  const failure = ((): OpenTemplateFailure | undefined => {
    if (!AsyncResult.isFailure(result) || AsyncResult.isWaiting(result)) return undefined
    const error = Option.getOrUndefined(AsyncResult.error(result))
    if (error?._tag === 'ProjectTemplateNotFoundError') return { _tag: 'NotFound', name: templateName }
    if (error?._tag === 'ProjectTemplateInvalidError') return { _tag: 'Invalid', name: error.name }
    if (error?._tag === 'ProjectExerciseNotFoundError')
      return { _tag: 'ExerciseNotFound', name: error.name, exercise: error.exercise }
    if (error?._tag === 'ProjectIndexUnavailableError') return { _tag: 'IndexUnavailable', failure: error.failure }
    if (error?._tag === 'ProjectFilesUnavailableError') return { _tag: 'FilesUnavailable', name: templateName }
    return { _tag: 'Unknown', name: templateName }
  })()

  const opened = Option.getOrUndefined(AsyncResult.value(result))
  const files: ReadonlyMap<string, FileContent> = opened?.files ?? new Map()

  const template =
    opened === undefined
      ? undefined
      : {
          name: opened.templateName,
          title: opened.manifest.title,
          exercise: opened.exercise,
          health: opened.health,
          exercises: opened.manifest.exercises.map(({ name, title, kind }) => ({ name, title, kind })),
          entry: opened.manifest.runtime.entry,
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
    handleSave: (edits: ReadonlyArray<ProjectFileEdit>) => save(edits),
    handleReset: () => reset(),
    handleApplySolution: () => applySolution(),
    handleRetry: () => refresh(),
  }
}
