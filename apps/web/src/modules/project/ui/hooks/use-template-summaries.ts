import { useAtomRefresh, useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { templateSummariesAtom } from '../../core/atoms/project.atoms.ts'
import { ProjectLoadFailure } from '../../core/domain/constants/project-load-failure.constant.ts'

export const useTemplateSummaries = () => {
  const result = useAtomValue(templateSummariesAtom)
  const refresh = useAtomRefresh(templateSummariesAtom)
  const isLoading = AsyncResult.isInitial(result) || AsyncResult.isWaiting(result)
  const error = isLoading ? undefined : Option.getOrUndefined(AsyncResult.error(result))
  return {
    templates: Option.getOrElse(AsyncResult.value(result), () => []),
    isLoading,
    failure: ((): ProjectLoadFailure | undefined => {
      if (error === undefined) return undefined
      return error._tag === 'ProjectIndexUnavailableError' ? error.failure : ProjectLoadFailure.NETWORK
    })(),
    handleRetry: () => refresh(),
  }
}
