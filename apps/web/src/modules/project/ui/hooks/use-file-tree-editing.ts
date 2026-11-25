import { useRef, useState } from 'react'

import {
  checkNewPath,
  creationFolderOf,
  FileNameIssue,
  isRenamable,
  movesOf,
  parentOf,
  type FileMove,
  type FileNameCheck,
  type FileTreeDraft,
  type TreeItemRef,
} from '../../core/domain/file-operations.domain-model.ts'
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import type { FileTreeEditing } from '../components/FileTree.tsx'

export type FileTreeEditingSinks = {
  readonly paths: ReadonlyArray<string>
  readonly onCreateFile: (path: string) => void
  readonly onMove: (moves: ReadonlyArray<FileMove>) => void
}

const isWithin = (path: string, folder: string) => path === folder || path.startsWith(`${folder}/`)

export const useFileTreeEditing = ({ paths, onCreateFile, onMove }: FileTreeEditingSinks) => {
  const [folders, setFolders] = useState<ReadonlyArray<string>>([])
  const [draft, setDraftState] = useState<FileTreeDraft | undefined>(undefined)
  const openDraft = useRef<FileTreeDraft | undefined>(undefined)
  const [issue, setIssue] = useState<FileNameIssue | undefined>(undefined)
  const [focusRequest, setFocusRequest] = useState<{ readonly path: string } | undefined>(undefined)

  const setDraft = (next: FileTreeDraft | undefined) => {
    openDraft.current = next
    setDraftState(next)
  }

  const emptyFolders = folders.filter((folder) => !paths.some((path) => isWithin(path, folder)))

  const checkOf = (current: FileTreeDraft, name: string): FileNameCheck =>
    current._tag === 'Create'
      ? checkNewPath({ parent: current.parentPath, name, paths, folders: emptyFolders })
      : checkNewPath({ parent: parentOf(current.path), name, paths, folders: emptyFolders, renamed: current.path })

  const close = (focusPath: string | undefined) => {
    setDraft(undefined)
    setIssue(undefined)
    if (focusPath !== undefined) setFocusRequest({ path: focusPath })
  }

  const apply = (current: FileTreeDraft, path: string) => {
    if (current._tag === 'Create') {
      if (current.kind === 'folder') setFolders((previous) => [...previous, path])
      else onCreateFile(path)
    } else if (path !== current.path) {
      const moves = movesOf(paths, current.path, path)
      if (moves.length > 0) onMove(moves)
      setFolders((previous) =>
        previous.map((folder) =>
          isWithin(folder, current.path) ? `${path}${folder.slice(current.path.length)}` : folder
        )
      )
    }
    close(path)
  }

  const submit = (name: string, onIssue: (issue: FileNameIssue) => void) => {
    const current = openDraft.current
    if (current === undefined) return
    const check = checkOf(current, name)
    if (check._tag === 'Valid') apply(current, check.path)
    else onIssue(check.issue)
  }

  const editing: FileTreeEditing = {
    draft,
    issue,
    focusRequest,
    onCreate: (kind: 'file' | 'folder', from: TreeItemRef | undefined) => {
      setIssue(undefined)
      setDraft({ _tag: 'Create', kind, parentPath: creationFolderOf(from) })
    },
    onRename: (path: string, isFolder: boolean) => {
      if (!isRenamable(path)) {
        setDraft(undefined)
        setIssue(FileNameIssue.READ_ONLY)
        return
      }
      setIssue(undefined)
      setDraft({ _tag: 'Rename', path, isFolder })
    },
    onDraftChange: (name: string) => {
      const current = openDraft.current
      if (current === undefined) return
      const check = checkOf(current, name)
      setIssue(check._tag === 'Invalid' && check.issue !== FileNameIssue.EMPTY ? check.issue : undefined)
    },
    onDraftSubmit: (name: string) => submit(name, setIssue),
    onDraftBlur: (name: string) => submit(name, () => close(undefined)),
    onDraftCancel: () => close(undefined),
  }

  return {
    nodes: buildFileTree(paths, emptyFolders),
    editing,
    handleReset: () => {
      setFolders([])
      close(undefined)
    },
  }
}
