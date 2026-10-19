import type { RuntimeKind } from '@typika/manifest'
import type { ProjectPath } from '@typika/runtime-core'
import { useEffect, useRef, useState } from 'react'

import { useEditFiles, type FileEdit } from '../../../editor/ui/hooks/use-edit-files.ts'
import { useSandboxRuntime } from '../../../runtime/ui/hooks/use-sandbox-runtime.ts'
import { useWriteProjectFiles } from '../../../runtime/ui/hooks/use-write-project-files.ts'
import { EmbedPanel } from '../../core/domain/constants/embed-option.constant.ts'
import { runsOnLoad, type EmbedOptions } from '../../core/domain/embed.domain-model.ts'

type EmbedAction = 'run' | 'test'

const NO_EDITS = () => undefined

export const useEmbedRuntime = (projectKey: string, options: EmbedOptions, runtime: RuntimeKind | undefined) => {
  const isSecure = window.isSecureContext
  const [isStarted, setStarted] = useState(false)
  const [pendingAction, setPendingAction] = useState<EmbedAction | undefined>(undefined)
  const unsynced = useRef(new Map<ProjectPath, string>())
  const writeFiles = useWriteProjectFiles(projectKey)
  const edits = useEditFiles({
    onPersist: NO_EDITS,
    onSync: (synced: ReadonlyArray<FileEdit>) => {
      if (isStarted) return writeFiles(synced)
      for (const [path, content] of synced) unsynced.current.set(path, content)
    },
  })
  const sandbox = useSandboxRuntime(
    projectKey,
    () => {
      const writes = [...unsynced.current, ...edits.commitPending()]
      unsynced.current.clear()
      return writes
    },
    { isStarted }
  )

  const start = (action: EmbedAction) => {
    if (!isSecure) return
    if (isStarted && sandbox.status === 'ready') return action === 'run' ? sandbox.handleRun() : sandbox.handleTest()
    setStarted(true)
    setPendingAction(action)
  }

  useEffect(() => {
    if (sandbox.status !== 'ready' || pendingAction === undefined) return
    setPendingAction(undefined)
    if (pendingAction === 'run') sandbox.handleRun()
    else sandbox.handleTest()
  }, [sandbox.status, pendingAction])

  useEffect(() => {
    if (runtime !== undefined && runsOnLoad(options, runtime))
      start(options.panel === EmbedPanel.TESTS ? 'test' : 'run')
  }, [runtime])

  return {
    ...sandbox,
    status: isSecure ? sandbox.status : ('insecure' as const),
    isRunning: sandbox.isRunning || pendingAction === 'run',
    isTesting: sandbox.isTesting || pendingAction === 'test',
    handleChange: edits.handleChange,
    editedContentOf: edits.editedContentOf,
    editedFiles: edits.editedFiles,
    handleRun: () => start('run'),
    handleTest: () => start('test'),
  }
}
