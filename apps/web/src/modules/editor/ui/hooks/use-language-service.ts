import { useAtomValue } from '@effect/atom-react'
import { RuntimeKind } from '@typika/manifest'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'

import { templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import { languageServiceAtom } from '../../core/atoms/editor.atoms.ts'
import {
  isGoSourcePath,
  isLanguageServiceInput,
  LanguageServiceName,
} from '../../core/domain/language-service.domain-model.ts'
import type { FileStructureRequest } from './use-edit-files.ts'

export type LanguageServiceStatus = 'starting' | 'ready' | 'unavailable' | 'outdated' | 'off'

const offAtom = Atom.make(AsyncResult.success(undefined))

export const useLanguageService = (
  templateName: string,
  { isStarted = true }: { readonly isStarted?: boolean } = {}
) => {
  const result = useAtomValue(isStarted ? languageServiceAtom(templateName) : offAtom)
  const session = Option.getOrUndefined(AsyncResult.value(result))
  const kind = Option.getOrUndefined(AsyncResult.value(useAtomValue(templateProjectAtom(templateName))))?.manifest
    .runtime.kind
  const service = kind === RuntimeKind.GO ? LanguageServiceName.GOPLS : LanguageServiceName.TYPESCRIPT
  const isInput = (path: string) => isLanguageServiceInput(path) || isGoSourcePath(path)
  const status: LanguageServiceStatus = AsyncResult.isSuccess(result)
    ? session === undefined
      ? 'off'
      : 'ready'
    : AsyncResult.isFailure(result)
      ? Option.getOrUndefined(Cause.findErrorOption(result.cause))?._tag === 'EditorOutdatedError'
        ? 'outdated'
        : 'unavailable'
      : 'starting'
  const handleStructureChange = ({ written, removed }: FileStructureRequest) => {
    if (session === undefined) return
    const updates = [
      ...removed.filter(isInput).map((path) => session.removeFile(path)),
      ...written.filter(([path]) => isInput(path)).map(([path, content]) => session.updateFile(path, content)),
    ]
    void Effect.runPromise(Effect.ignore(Effect.all(updates, { discard: true })))
  }
  const handleReload = () => window.location.reload()
  return { session, service, status, handleStructureChange, handleReload }
}
