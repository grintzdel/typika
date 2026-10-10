import { useAtomSet } from '@effect/atom-react'

import { writeProjectFilesAtom } from '../../core/atoms/runtime.atoms.ts'

export const useWriteProjectFiles = (templateName: string) => useAtomSet(writeProjectFilesAtom(templateName))
