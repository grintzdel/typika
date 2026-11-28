import { isTypikaFile, TYPIKA_GROUP_PATH } from './file-tree.domain-model.ts'

export const FileNameIssue = {
  EMPTY: 'empty',
  INVALID: 'invalid',
  TAKEN: 'taken',
  RESERVED: 'reserved',
  READ_ONLY: 'read-only',
  INSIDE_ITSELF: 'inside-itself',
} as const

export type FileNameIssue = (typeof FileNameIssue)[keyof typeof FileNameIssue]

export type FileNameCheck =
  | { readonly _tag: 'Valid'; readonly path: string }
  | { readonly _tag: 'Invalid'; readonly issue: FileNameIssue }

export type FileMove = readonly [from: string, to: string]

export type TreeItemRef = { readonly path: string; readonly isFolder: boolean }

export type FileTreeDeletion = TreeItemRef & { readonly files: ReadonlyArray<string> }

export type FileTreeMoving = TreeItemRef & { readonly folders: ReadonlyArray<string> }

export type FileTreeDraft =
  | { readonly _tag: 'Create'; readonly kind: 'file' | 'folder'; readonly parentPath: string }
  | { readonly _tag: 'Rename'; readonly path: string; readonly isFolder: boolean }

const FORBIDDEN = /[/\\:*?"<>|\p{Cc}]/u

export const parentOf = (path: string): string => path.slice(0, Math.max(path.lastIndexOf('/'), 0))

export const nameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

export const pathIn = (parent: string, name: string): string => (parent === '' ? name : `${parent}/${name}`)

export const isWithin = (path: string, folder: string) => path === folder || path.startsWith(`${folder}/`)

const isReserved = (path: string) => isTypikaFile(path) || isTypikaFile(`${path}/`)

export const isEditable = (path: string): boolean => path !== TYPIKA_GROUP_PATH && !isReserved(path)

export const checkNewPath = ({
  parent,
  name,
  paths,
  folders,
  renamed,
}: {
  readonly parent: string
  readonly name: string
  readonly paths: ReadonlyArray<string>
  readonly folders: ReadonlyArray<string>
  readonly renamed?: string | undefined
}): FileNameCheck => {
  const trimmed = name.trim()
  if (trimmed === '') return { _tag: 'Invalid', issue: FileNameIssue.EMPTY }
  if (trimmed === '.' || trimmed === '..' || FORBIDDEN.test(trimmed))
    return { _tag: 'Invalid', issue: FileNameIssue.INVALID }
  const path = pathIn(parent, trimmed)
  if (isReserved(path)) return { _tag: 'Invalid', issue: FileNameIssue.RESERVED }
  const others = (candidate: string) => renamed === undefined || !isWithin(candidate, renamed)
  if ([...paths, ...folders].filter(others).some((existing) => isWithin(existing, path)))
    return { _tag: 'Invalid', issue: FileNameIssue.TAKEN }
  return { _tag: 'Valid', path }
}

export const filesWithin = (paths: ReadonlyArray<string>, item: string): ReadonlyArray<string> =>
  paths.filter((path) => isWithin(path, item)).toSorted()

export const movesOf = (paths: ReadonlyArray<string>, from: string, to: string): ReadonlyArray<FileMove> =>
  filesWithin(paths, from).map((path): FileMove => [path, `${to}${path.slice(from.length)}`])

export const creationFolderOf = (item: TreeItemRef | undefined): string => {
  if (item === undefined || !isEditable(item.path)) return ''
  return item.isFolder ? item.path : parentOf(item.path)
}

export const checkMove = ({
  item,
  folder,
  paths,
  folders,
}: {
  readonly item: TreeItemRef
  readonly folder: string
  readonly paths: ReadonlyArray<string>
  readonly folders: ReadonlyArray<string>
}): FileNameCheck => {
  if (!isEditable(item.path)) return { _tag: 'Invalid', issue: FileNameIssue.READ_ONLY }
  if (folder !== '' && !isEditable(folder)) return { _tag: 'Invalid', issue: FileNameIssue.RESERVED }
  if (item.isFolder && isWithin(folder, item.path)) return { _tag: 'Invalid', issue: FileNameIssue.INSIDE_ITSELF }
  return checkNewPath({ parent: folder, name: nameOf(item.path), paths, folders, renamed: item.path })
}

const ancestorsOf = (path: string): ReadonlyArray<string> =>
  path
    .split('/')
    .slice(0, -1)
    .map((_, index, segments) => segments.slice(0, index + 1).join('/'))

export const moveTargetsOf = (
  item: TreeItemRef,
  paths: ReadonlyArray<string>,
  folders: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const all = new Set([
    ...paths.filter((path) => !isReserved(path)).flatMap(ancestorsOf),
    ...folders.flatMap((folder) => [...ancestorsOf(folder), folder]),
  ])
  return ['', ...[...all].toSorted()].filter(
    (folder) => folder !== parentOf(item.path) && !(item.isFolder && isWithin(folder, item.path))
  )
}
