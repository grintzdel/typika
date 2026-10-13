import { useAtomValue } from '@effect/atom-react'
import { useHydrated } from '@tanstack/react-router'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'

import { HIDDEN_UNTIL_CONFIG_LOADS, hiddenLanguagesAtom } from '../../core/atoms/hidden-languages.atoms.ts'
import type { HiddenLanguages } from '../../core/domain/hidden-languages.domain-model.ts'

const prerenderedAtom: typeof hiddenLanguagesAtom = Atom.make(AsyncResult.success(HIDDEN_UNTIL_CONFIG_LOADS))

export const useHiddenLanguages = (): HiddenLanguages => {
  const isHydrated = useHydrated()
  const result = useAtomValue(isHydrated ? hiddenLanguagesAtom : prerenderedAtom)
  return Option.getOrElse(AsyncResult.value(result), () => HIDDEN_UNTIL_CONFIG_LOADS)
}
