import { useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { languageServiceAtom } from '../../core/atoms/editor.atoms.ts'

export const useLanguageService = (templateName: string) =>
  Option.getOrUndefined(AsyncResult.value(useAtomValue(languageServiceAtom(templateName))))
