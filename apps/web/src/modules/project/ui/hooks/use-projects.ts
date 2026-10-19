import { useAtomSet, useAtomValue } from '@effect/atom-react'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import {
  deleteProjectAtom,
  duplicateProjectAtom,
  exportStoredProjectAtom,
  projectsAtom,
  renameProjectAtom,
  storageUsageAtom,
} from '../../core/atoms/project.atoms.ts'
import { downloadArchive } from './download-archive.ts'

export const useProjects = () => {
  const result = useAtomValue(projectsAtom)
  const storage = useAtomValue(storageUsageAtom)
  const rename = useAtomSet(renameProjectAtom)
  const duplicate = useAtomSet(duplicateProjectAtom)
  const remove = useAtomSet(deleteProjectAtom)
  const exportProject = useAtomSet(exportStoredProjectAtom, { mode: 'promiseExit' })
  const projects = AsyncResult.value(result)
  return {
    projects: Option.getOrElse(projects, () => []),
    isLoading: Option.isNone(projects) && !AsyncResult.isFailure(result),
    loadFailed: AsyncResult.isFailure(result),
    storage: Option.getOrUndefined(AsyncResult.value(storage)),
    now: Date.now(),
    handleRename: (id: string, name: string) => rename({ id, name }),
    handleDuplicate: (id: string, name: string) => duplicate({ id, name }),
    handleDelete: (id: string) => remove(id),
    handleExport: (id: string, includeTypikaFiles: boolean) => {
      void exportProject({ id, includeTypikaFiles }).then((exit) => {
        if (Exit.isSuccess(exit)) downloadArchive(exit.value)
      })
    },
  }
}
