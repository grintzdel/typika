import { useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { languageServiceAtom } from '../../core/atoms/editor.atoms.ts'

export type LanguageServiceStatus = 'starting' | 'ready' | 'unavailable' | 'off'

export const useLanguageService = (templateName: string) => {
  const result = useAtomValue(languageServiceAtom(templateName))
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
