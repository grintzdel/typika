import { withoutTypikaFiles, withParent } from '@typika/manifest'
import { strToU8, zipSync } from 'fflate'

export type ProjectArchive = { readonly fileName: string; readonly bytes: Uint8Array }

const UNSAFE_FILE_NAME = /[\\/:*?"<>|]/g

export const archiveNameOf = (name: string): string => `${name.replace(UNSAFE_FILE_NAME, '-').trim() || 'project'}.zip`

export const projectArchiveOf = ({
  name,
  ref,
  files,
  includeTypikaFiles,
}: {
  readonly name: string
  readonly ref: string | undefined
  readonly files: ReadonlyMap<string, string>
  readonly includeTypikaFiles: boolean
}): ProjectArchive => {
  const exported = includeTypikaFiles ? (ref === undefined ? files : withParent(files, ref)) : withoutTypikaFiles(files)
  return {
    fileName: archiveNameOf(name),
    bytes: zipSync(Object.fromEntries([...exported].map(([path, content]) => [path, strToU8(content)]))),
  }
}
