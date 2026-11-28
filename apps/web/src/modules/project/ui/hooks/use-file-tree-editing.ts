import { useRef, useState } from 'react'

import {
  checkMove,
  checkNewPath,
  creationFolderOf,
  FileNameIssue,
  filesWithin,
  isEditable,
  isWithin,
  moveTargetsOf,
  movesOf,
  parentOf,
  type FileMove,
  type FileNameCheck,
  type FileTreeDeletion,
  type FileTreeDraft,
  type FileTreeMoving,
  type TreeItemRef,
} from '../../core/domain/file-operations.domain-model.ts'
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import type { FileTreeEditing } from '../components/FileTree.tsx'

export type FileTreeEditingSinks = {
  readonly paths: ReadonlyArray<string>
  readonly onCreateFile: (path: string) => void
  readonly onMove: (moves: ReadonlyArray<FileMove>) => void
  readonly onDelete: (paths: ReadonlyArray<string>) => void
}

export const useFileTreeEditing = ({ paths, onCreateFile, onMove, onDelete }: FileTreeEditingSinks) => {
  const [folders, setFolders] = useState<ReadonlyArray<string>>([])
  const [draft, setDraftState] = useState<FileTreeDraft | undefined>(undefined)
  const openDraft = useRef<FileTreeDraft | undefined>(undefined)
  const [issue, setIssue] = useState<FileNameIssue | undefined>(undefined)
  const [focusRequest, setFocusRequest] = useState<{ readonly path: string } | undefined>(undefined)
  const [deletion, setDeletion] = useState<FileTreeDeletion | undefined>(undefined)
  const [moving, setMoving] = useState<FileTreeMoving | undefined>(undefined)

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
    } else relocate(current.path, path)
    close(path)
  }

  const relocate = (from: string, to: string) => {
    if (to === from) return
    const moves = movesOf(paths, from, to)
    if (moves.length > 0) onMove(moves)
    const left = parentOf(from)
    setFolders((previous) => [
      ...previous.map((folder) => (isWithin(folder, from) ? `${to}${folder.slice(from.length)}` : folder)),
      ...(left === '' || previous.includes(left) ? [] : [left]),
    ])
  }

  const refuseReadOnly = (path: string) => {
    const isReadOnly = !isEditable(path)
    setIssue(isReadOnly ? FileNameIssue.READ_ONLY : undefined)
    return isReadOnly
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
      setDraft(refuseReadOnly(path) ? undefined : { _tag: 'Rename', path, isFolder })
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
    deletion,
    onDelete: (path: string, isFolder: boolean) => {
      if (refuseReadOnly(path)) return
      setDeletion({ path, isFolder, files: filesWithin(paths, path) })
    },
    onDeleteConfirm: () => {
      if (deletion === undefined) return
      if (deletion.files.length > 0) onDelete(deletion.files)
      setFolders((previous) => previous.filter((folder) => !isWithin(folder, deletion.path)))
      setDeletion(undefined)
    },
    onDeleteCancel: () => setDeletion(undefined),
    moving,
    onMoveStart: (path: string, isFolder: boolean) => {
      if (refuseReadOnly(path)) return
      const item = { path, isFolder }
      setMoving({ ...item, folders: moveTargetsOf(item, paths, emptyFolders) })
    },
    onMoveTo: (item: TreeItemRef, folder: string) => {
      const check = checkMove({ item, folder, paths, folders: emptyFolders })
      if (check._tag === 'Invalid') {
        setIssue(check.issue)
        return
      }
      setIssue(undefined)
      setMoving(undefined)
      if (check.path === item.path) return
      relocate(item.path, check.path)
      setFocusRequest({ path: check.path })
    },
    onMoveCancel: () => {
      setIssue(undefined)
      setMoving(undefined)
    },
  }

  return {
    nodes: buildFileTree(paths, emptyFolders),
    editing,
    handleReset: () => {
      setFolders([])
      setDeletion(undefined)
      setMoving(undefined)
      close(undefined)
    },
  }
}
