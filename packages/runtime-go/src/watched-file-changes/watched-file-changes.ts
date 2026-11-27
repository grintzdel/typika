import type { ProjectFiles } from '../plan-go-build/plan-go-build.ts'

export const FileChangeType = {
  CREATED: 1,
  CHANGED: 2,
  DELETED: 3,
} as const

export type FileChangeType = (typeof FileChangeType)[keyof typeof FileChangeType]

export type FileEvent = { readonly uri: string; readonly type: FileChangeType }

const encoder = new TextEncoder()

const bytesOf = (content: string | Uint8Array) => (typeof content === 'string' ? encoder.encode(content) : content)

const sameContent = (a: string | Uint8Array, b: string | Uint8Array) => {
  if (typeof a === 'string' && typeof b === 'string') return a === b
  const left = bytesOf(a)
  const right = bytesOf(b)
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index])
}

const fileUri = (root: string, path: string) => `file://${encodeURI(`${root}/${path}`)}`

const changeOf = (
  before: string | Uint8Array | undefined,
  after: string | Uint8Array | undefined
): FileChangeType | undefined => {
  if (before === undefined) return after === undefined ? undefined : FileChangeType.CREATED
  if (after === undefined) return FileChangeType.DELETED
  return sameContent(before, after) ? undefined : FileChangeType.CHANGED
}

export const watchedFileChanges = (
  root: string,
  previous: ProjectFiles,
  next: ProjectFiles
): ReadonlyArray<FileEvent> =>
  [...new Set([...previous.keys(), ...next.keys()])].toSorted().flatMap((path) => {
    const type = changeOf(previous.get(path), next.get(path))
    return type === undefined ? [] : [{ uri: fileUri(root, path), type }]
  })
