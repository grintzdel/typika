import { useAtomRefresh, useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { embeddedTemplatesAtom } from '../../../project/core/atoms/project.atoms.ts'
import { openTemplateFailureOf } from '../../../project/ui/hooks/use-template-project.ts'
import { comparisonAtom } from '../../core/atoms/compare.atoms.ts'

export const useComparison = (name: string, a: string | undefined, b: string | undefined) => {
  const atom = comparisonAtom({ name, a, b })
  const result = useAtomValue(atom)
  const refresh = useAtomRefresh(atom)
  const embeddedTemplates = Option.getOrElse(AsyncResult.value(useAtomValue(embeddedTemplatesAtom)), () => [])
  return {
    embeddedTemplates,
    comparison: Option.getOrUndefined(AsyncResult.value(result)),
    failure: openTemplateFailureOf(result, name),
    handleRetry: () => refresh(),
  }
}
