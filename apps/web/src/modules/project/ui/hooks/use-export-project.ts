import { useAtomSet } from '@effect/atom-react'
import * as Exit from 'effect/Exit'

import { exportProjectAtom } from '../../core/atoms/project.atoms.ts'
import { downloadArchive } from './download-archive.ts'

export const useExportProject = (projectKey: string) => {
  const exportProject = useAtomSet(exportProjectAtom(projectKey), { mode: 'promiseExit' })
  return {
    handleExport: (files: ReadonlyMap<string, string>, includeTypikaFiles: boolean) => {
      void exportProject({ files, includeTypikaFiles }).then((exit) => {
        if (Exit.isSuccess(exit)) downloadArchive(exit.value)
      })
    },
  }
}
