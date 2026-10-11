import { matchGlob } from '@typika/manifest'

export const FileChangeStatus = {
  ADDED: 'added',
  MODIFIED: 'modified',
  DELETED: 'deleted',
} as const

export type FileChangeStatus = (typeof FileChangeStatus)[keyof typeof FileChangeStatus]

export type FileChange = {
  readonly path: string
  readonly status: FileChangeStatus
  readonly before: string
  readonly after: string
}

export const DiffSource = {
  BASE: 'base',
  MINE: 'mine',
} as const

export type DiffSource = (typeof DiffSource)[keyof typeof DiffSource]

const OUT_OF_DEFAULT_FOCUS = ['tour/', 'exercises/']
const TOUR_REGION = /^\/\/ #region tour:/
const ANY_REGION = /^\/\/ #region /
const REGION_END = '// #endregion'

const statusOf = (before: string | undefined, after: string | undefined): FileChangeStatus | undefined => {
  if (before === after) return undefined
  if (before === undefined) return FileChangeStatus.ADDED
  if (after === undefined) return FileChangeStatus.DELETED
  return FileChangeStatus.MODIFIED
}

export const fileChanges = (
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
  include: (path: string) => boolean
): ReadonlyArray<FileChange> =>
  [...new Set([...before.keys(), ...after.keys()])]
    .filter(include)
    .toSorted()
    .flatMap((path) => {
      const status = statusOf(before.get(path), after.get(path))
      return status === undefined
        ? []
        : [{ path, status, before: before.get(path) ?? '', after: after.get(path) ?? '' }]
    })

export const baseFocus = (focus: ReadonlyArray<string> | undefined): ((path: string) => boolean) => {
  if (focus === undefined) return (path) => !OUT_OF_DEFAULT_FOCUS.some((folder) => path.startsWith(folder))
  const matchers = focus.map(matchGlob)
  return (path) => matchers.some((matches) => matches(path))
}

export const withoutTourMarkers = (content: string): string => {
  const open: Array<boolean> = []
  return content
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (ANY_REGION.test(trimmed)) {
        const isTour = TOUR_REGION.test(trimmed)
        open.push(isTour)
        return !isTour
      }
      if (trimmed === REGION_END) return open.pop() !== true
      return true
    })
    .join('\n')
}
