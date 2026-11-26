import { useAtomSet, useAtomValue } from '@effect/atom-react'
import type { Language } from '@typika/manifest'
import * as Cause from 'effect/Cause'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import { useState } from 'react'

import {
  catalogueAtom,
  copyTemplateAtom,
  createBlankProjectAtom,
  importFileAtom,
  importFromUrlAtom,
} from '../../core/atoms/project.atoms.ts'
import { ProjectManifestMissingError } from '../../core/domain/errors/project-manifest-missing.error.ts'
import { ProjectSourceInvalidError } from '../../core/domain/errors/project-source-invalid.error.ts'
import { ProjectSourceUnavailableError } from '../../core/domain/errors/project-source-unavailable.error.ts'
import { ProjectTemplateInvalidError } from '../../core/domain/errors/project-template-invalid.error.ts'
import { projectPathOf } from '../../core/domain/project.domain-model.ts'
import type { NewProjectFailure } from '../components/NewProjectDialog.tsx'

type CreateStatus =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Creating' }
  | { readonly _tag: 'Failed'; readonly failure: NewProjectFailure }

const IDLE: CreateStatus = { _tag: 'Idle' }

const failureOf = (error: unknown): NewProjectFailure => {
  if (error instanceof ProjectSourceInvalidError)
    return error.reason === 'url' ? { _tag: 'Url' } : { _tag: 'Archive', reason: error.reason }
  if (error instanceof ProjectSourceUnavailableError) return { _tag: 'Unavailable', reason: error.reason }
  if (error instanceof ProjectManifestMissingError) return { _tag: 'ManifestMissing' }
  if (error instanceof ProjectTemplateInvalidError)
    return { _tag: 'Invalid', issues: error.issues.map(({ path, message }) => ({ path, message })) }
  return { _tag: 'Storage' }
}

export const useNewProject = ({
  initialTemplate,
  open = (path) => window.location.assign(path),
}: {
  readonly initialTemplate: string | undefined
  readonly open?: (path: string) => void
}) => {
  const [isOpen, setOpen] = useState(initialTemplate !== undefined)
  const [status, setStatus] = useState<CreateStatus>(IDLE)
  const catalogue = useAtomValue(catalogueAtom)
  const createBlank = useAtomSet(createBlankProjectAtom, { mode: 'promiseExit' })
  const copyTemplate = useAtomSet(copyTemplateAtom, { mode: 'promiseExit' })
  const importFromUrl = useAtomSet(importFromUrlAtom, { mode: 'promiseExit' })
  const importFile = useAtomSet(importFileAtom, { mode: 'promiseExit' })

  const settle = (created: Promise<Exit.Exit<string, unknown>>) => {
    setStatus({ _tag: 'Creating' })
    void created.then((exit) => {
      if (Exit.isSuccess(exit)) open(projectPathOf(exit.value))
      else
        setStatus({
          _tag: 'Failed',
          failure: failureOf(Option.getOrUndefined(Cause.findErrorOption(exit.cause))),
        })
    })
  }

  return {
    isOpen,
    initialTemplate,
    templates: Option.getOrElse(AsyncResult.value(catalogue), () => []),
    isCreating: status._tag === 'Creating',
    failure: status._tag === 'Failed' ? status.failure : undefined,
    handleOpenChange: (next: boolean) => {
      setOpen(next)
      setStatus(IDLE)
    },
    handleTabChange: () => setStatus(IDLE),
    handleCreateBlank: (input: { readonly name: string; readonly language: Language }) =>
      settle(createBlank({ name: input.name.trim(), language: input.language })),
    handleCopyTemplate: (input: { readonly template: string; readonly name: string }) =>
      settle(copyTemplate({ template: input.template, name: input.name.trim() })),
    handleImportUrl: (url: string) => settle(importFromUrl(url)),
    handleImportFile: (file: File) =>
      settle(file.arrayBuffer().then((buffer) => importFile({ fileName: file.name, bytes: new Uint8Array(buffer) }))),
  }
}
