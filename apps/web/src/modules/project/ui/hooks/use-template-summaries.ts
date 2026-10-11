import { useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { templateSummariesAtom } from '../../core/atoms/project.atoms.ts'

export const useTemplateSummaries = () => {
  const result = useAtomValue(templateSummariesAtom)
  return {
    templates: Option.getOrElse(AsyncResult.value(result), () => []),
    isLoading: AsyncResult.isInitial(result),
  }
}
