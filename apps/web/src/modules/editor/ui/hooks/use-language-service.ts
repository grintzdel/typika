import { useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'

import { languageServiceAtom } from '../../core/atoms/editor.atoms.ts'

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
  return { session, status }
}
