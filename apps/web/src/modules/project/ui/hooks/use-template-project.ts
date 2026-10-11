import { useAtom, useAtomSet, useAtomValue } from '@effect/atom-react'
import type { FileContent } from '@typika/runtime-core'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import {
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
  | { readonly _tag: 'Unknown'; readonly name: string }

export const useTemplateProject = (templateName: string) => {
  const result = useAtomValue(templateProjectAtom(templateName))
  const [saveResult, save] = useAtom(saveProjectFilesAtom(templateName))
  const reset = useAtomSet(resetProjectAtom(templateName))
  const embeddedTemplates = Option.getOrElse(AsyncResult.value(useAtomValue(embeddedTemplatesAtom)), () => [])

  const failure = ((): OpenTemplateFailure | undefined => {
    if (!AsyncResult.isFailure(result)) return undefined
    const error = Option.getOrUndefined(AsyncResult.error(result))
    if (error?._tag === 'ProjectTemplateNotFoundError') return { _tag: 'NotFound', name: templateName }
    if (error?._tag === 'ProjectTemplateInvalidError') return { _tag: 'Invalid', name: templateName }
    return { _tag: 'Unknown', name: templateName }
  })()

  const opened = Option.getOrUndefined(AsyncResult.value(result))
  const files: ReadonlyMap<string, FileContent> = opened?.files ?? new Map()

  const template =
    opened === undefined
      ? undefined
      : {
          title: opened.manifest.title,
          entry: opened.manifest.runtime.entry,
          generation: opened.generation,
          tourSteps: opened.tourSteps,
          tree: buildFileTree(opened.files.keys()),
          contentOf: (path: string) => {
            const content = files.get(path)
            return content === undefined ? '' : textOf(content)
          },
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
  }
}
