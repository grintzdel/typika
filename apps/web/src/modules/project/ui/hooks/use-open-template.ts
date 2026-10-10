import { useAtomValue } from '@effect/atom-react'
import type { FileContent } from '@typika/runtime-core'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { templateProjectAtom } from '../../core/atoms/project.atoms.ts'
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'

export type OpenTemplateFailure =
  | { readonly _tag: 'NotFound'; readonly name: string }
  | { readonly _tag: 'Invalid'; readonly name: string }
  | { readonly _tag: 'Unknown'; readonly name: string }

export const useOpenTemplate = (templateName: string) => {
  const result = useAtomValue(templateProjectAtom(templateName))

  const failure = ((): OpenTemplateFailure | undefined => {
    if (!AsyncResult.isFailure(result)) return undefined
    const error = Option.getOrUndefined(AsyncResult.error(result))
    if (error?._tag === 'ProjectTemplateNotFoundError') return { _tag: 'NotFound', name: templateName }
    if (error?._tag === 'ProjectTemplateInvalidError') return { _tag: 'Invalid', name: templateName }
    return { _tag: 'Unknown', name: templateName }
  })()

  const template = Option.match(AsyncResult.value(result), {
    onNone: () => undefined,
    onSome: (project) => {
      const files: ReadonlyMap<string, FileContent> = project.files
      return {
        title: project.manifest.title,
        entry: project.manifest.runtime.entry,
        tree: buildFileTree(project.files.keys()),
        contentOf: (path: string) => {
          const content = files.get(path)
          return typeof content === 'string' ? content : new TextDecoder().decode(content)
        },
      }
    },
  })

  return { template, failure, isLoading: template === undefined && failure === undefined }
}
