import { useAtomValue } from '@effect/atom-react'
import { useHydrated } from '@tanstack/react-router'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'

import { hiddenLanguagesAtom } from '../../core/atoms/hidden-languages.atoms.ts'
import type { HiddenLanguages } from '../../core/domain/hidden-languages.domain-model.ts'

const NOTHING_HIDDEN: HiddenLanguages = []

const nothingHiddenAtom: typeof hiddenLanguagesAtom = Atom.make(AsyncResult.success(NOTHING_HIDDEN))

export const useHiddenLanguages = (): HiddenLanguages => {
  const isHydrated = useHydrated()
  const result = useAtomValue(isHydrated ? hiddenLanguagesAtom : nothingHiddenAtom)
  return Option.getOrElse(AsyncResult.value(result), () => NOTHING_HIDDEN)
}
