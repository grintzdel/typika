import { useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { baseTemplateAtom } from '../../core/atoms/project.atoms.ts'

export const useBaseTemplate = (templateName: string) => {
  const result = useAtomValue(baseTemplateAtom(templateName))
  const base = Option.getOrUndefined(AsyncResult.value(result))
  return {
    base: base === undefined ? undefined : { ...base, files: base.files as ReadonlyMap<string, string> },
    isLoading: AsyncResult.isInitial(result),
  }
}
