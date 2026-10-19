import { useAtom } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import { useState } from 'react'

import { createShareLinkAtom } from '../../core/atoms/project.atoms.ts'

export const useShareLink = (projectKey: string) => {
  const [result, create] = useAtom(createShareLinkAtom(projectKey))
  const [isCopied, setCopied] = useState(false)
  return {
    link: Option.getOrUndefined(AsyncResult.value(result)),
    isCopied,
    handleCreate: (files: ReadonlyMap<string, string>) => {
      setCopied(false)
      create({ files, origin: window.location.origin })
    },
    handleCopy: (url: string) => {
      navigator.clipboard.writeText(url).then(
        () => setCopied(true),
        () => setCopied(false)
      )
    },
  }
}
