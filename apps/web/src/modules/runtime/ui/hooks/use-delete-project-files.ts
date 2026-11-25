import { useAtomSet } from '@effect/atom-react'

import { deleteProjectFilesAtom } from '../../core/atoms/runtime.atoms.ts'

export const useDeleteProjectFiles = (templateName: string) => useAtomSet(deleteProjectFilesAtom(templateName))
