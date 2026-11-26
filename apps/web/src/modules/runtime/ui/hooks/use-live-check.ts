import { useAtom, useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import { useEffect, useRef } from 'react'

import { checkProjectAtom, runtimeSessionAtom } from '../../core/atoms/runtime.atoms.ts'
import type { FileWrite } from '../../core/domain/file-write.domain-model.ts'

const CHECK_DELAY_MS = 400

export const useLiveCheck = (templateName: string, revision: unknown, takePending: () => ReadonlyArray<FileWrite>) => {
  const session = useAtomValue(runtimeSessionAtom(templateName))
  const [result, check] = useAtom(checkProjectAtom(templateName))
  const latestTakePending = useRef(takePending)
  const canCheck = AsyncResult.isSuccess(session) && session.value.check !== undefined

  useEffect(() => {
    latestTakePending.current = takePending
  })

  useEffect(() => {
    if (!canCheck) return undefined
    const timer = setTimeout(() => check(latestTakePending.current()), CHECK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [revision, canCheck, check])

  return { diagnostics: canCheck ? Option.getOrUndefined(AsyncResult.value(result)) : undefined }
}
