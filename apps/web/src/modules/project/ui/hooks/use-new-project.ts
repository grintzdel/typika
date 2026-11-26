import { useAtomSet, useAtomValue } from '@effect/atom-react'
import type { Language } from '@typika/manifest'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import { useState } from 'react'

import { catalogueAtom, copyTemplateAtom, createBlankProjectAtom } from '../../core/atoms/project.atoms.ts'
import { projectPathOf } from '../../core/domain/project.domain-model.ts'

type CreateStatus = 'idle' | 'creating' | 'failed'

export const useNewProject = ({
  initialTemplate,
  open = (path) => window.location.assign(path),
}: {
  readonly initialTemplate: string | undefined
  readonly open?: (path: string) => void
}) => {
  const [isOpen, setOpen] = useState(initialTemplate !== undefined)
  const [status, setStatus] = useState<CreateStatus>('idle')
  const catalogue = useAtomValue(catalogueAtom)
  const createBlank = useAtomSet(createBlankProjectAtom, { mode: 'promiseExit' })
  const copyTemplate = useAtomSet(copyTemplateAtom, { mode: 'promiseExit' })

  const settle = (created: Promise<Exit.Exit<string, unknown>>) => {
    setStatus('creating')
    void created.then((exit) => {
      if (Exit.isSuccess(exit)) open(projectPathOf(exit.value))
      else setStatus('failed')
    })
  }

  return {
    isOpen,
    initialTemplate,
    templates: Option.getOrElse(AsyncResult.value(catalogue), () => []),
    isCreating: status === 'creating',
    hasFailed: status === 'failed',
    handleOpenChange: (next: boolean) => {
      setOpen(next)
      setStatus('idle')
    },
    handleCreateBlank: (input: { readonly name: string; readonly language: Language }) =>
      settle(createBlank({ name: input.name.trim(), language: input.language })),
    handleCopyTemplate: (input: { readonly template: string; readonly name: string }) =>
      settle(copyTemplate({ template: input.template, name: input.name.trim() })),
  }
}
