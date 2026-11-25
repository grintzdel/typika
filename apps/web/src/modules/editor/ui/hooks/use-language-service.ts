import { useAtomValue } from '@effect/atom-react'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'

import { languageServiceAtom } from '../../core/atoms/editor.atoms.ts'
import { isLanguageServiceInput } from '../../core/domain/language-service.domain-model.ts'
import type { FileStructureRequest } from './use-edit-files.ts'

export type LanguageServiceStatus = 'starting' | 'ready' | 'unavailable' | 'off'

const offAtom = Atom.make(AsyncResult.success(undefined))

export const useLanguageService = (
  templateName: string,
  { isStarted = true }: { readonly isStarted?: boolean } = {}
) => {
  const result = useAtomValue(isStarted ? languageServiceAtom(templateName) : offAtom)
  const session = Option.getOrUndefined(AsyncResult.value(result))
  const status: LanguageServiceStatus = AsyncResult.isSuccess(result)
    ? session === undefined
      ? 'off'
      : 'ready'
    : AsyncResult.isFailure(result)
      ? 'unavailable'
      : 'starting'
  const handleStructureChange = ({ written, removed }: FileStructureRequest) => {
    if (session === undefined) return
    const updates = [
      ...removed.filter(isLanguageServiceInput).map((path) => session.removeFile(path)),
      ...written
        .filter(([path]) => isLanguageServiceInput(path))
        .map(([path, content]) => session.updateFile(path, content)),
    ]
    void Effect.runPromise(Effect.ignore(Effect.all(updates, { discard: true })))
  }
  return { session, status, handleStructureChange }
}
