import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from '../../../../ui/AlertDialog.tsx'
import { Button } from '../../../../ui/Button.tsx'
import { ContextMenu } from '../../../../ui/ContextMenu.tsx'
import {
  creationFolderOf,
  isEditable,
  isWithin,
  nameOf,
  parentOf,
  type FileNameIssue,
  type FileTreeDeletion,
  type FileTreeDraft,
  type FileTreeMoving,
  type TreeItemRef,
} from '../../core/domain/file-operations.domain-model.ts'
import { isTypikaFile, TYPIKA_GROUP_PATH, type FileTreeNode } from '../../core/domain/file-tree.domain-model.ts'
import { FileIcon, FolderIcon } from './FileIcon.tsx'
import { MoveDialog } from './MoveDialog.tsx'

export type FileTreeEditing = {
  readonly draft: FileTreeDraft | undefined
  readonly issue: FileNameIssue | undefined
  readonly focusRequest: { readonly path: string } | undefined
  readonly onCreate: (kind: 'file' | 'folder', from: TreeItemRef | undefined) => void
  readonly onRename: (path: string, isFolder: boolean) => void
  readonly onDraftChange: (name: string) => void
  readonly onDraftSubmit: (name: string) => void
  readonly onDraftBlur: (name: string) => void
  readonly onDraftCancel: () => void
  readonly deletion: FileTreeDeletion | undefined
  readonly onDelete: (path: string, isFolder: boolean) => void
  readonly onDeleteConfirm: () => void
  readonly onDeleteCancel: () => void
  readonly moving: FileTreeMoving | undefined
  readonly onMoveStart: (path: string, isFolder: boolean) => void
  readonly onMoveTo: (item: TreeItemRef, folder: string) => void
  readonly onMoveCancel: () => void
}

export type FileTreeProps = {
  readonly nodes: ReadonlyArray<FileTreeNode>
  readonly selectedPath: string | undefined
  readonly modifiedPaths: ReadonlyArray<string>
  readonly onSelect: (path: string) => void
  readonly editing?: FileTreeEditing | undefined
}

type VisibleItem = { readonly node: FileTreeNode; readonly parentPath: string | undefined }

const visibleItems = (
  nodes: ReadonlyArray<FileTreeNode>,
  collapsed: ReadonlySet<string>,
  parentPath?: string
): ReadonlyArray<VisibleItem> =>
  nodes.flatMap((node) => [
    { node, parentPath },
    ...(node._tag === 'Folder' && !collapsed.has(node.path) ? visibleItems(node.children, collapsed, node.path) : []),
  ])

const ROW = 'flex min-h-target cursor-pointer items-center gap-1 rounded-sm pr-2 text-compact whitespace-nowrap'

const indentOf = (depth: number) => ({ paddingLeft: `${0.5 + depth * 0.75}rem` })

const DRAG_TYPE = 'application/x-typika-path'

const ancestorsOf = (path: string) =>
  path
    .split('/')
    .slice(0, -1)
    .map((_, index, segments) => segments.slice(0, index + 1).join('/'))

const itemAt = (target: EventTarget): TreeItemRef | undefined => {
  const item = target instanceof Element ? target.closest<HTMLElement>('[data-path]') : null
  const path = item?.dataset.path
  return path === undefined ? undefined : { path, isFolder: item?.dataset.folder === 'true' }
}

const refOf = (node: FileTreeNode | undefined): TreeItemRef | undefined =>
  node === undefined ? undefined : { path: node.path, isFolder: node._tag === 'Folder' }

const stemLength = (name: string, isFolder: boolean) => {
  const dot = name.lastIndexOf('.')
  return isFolder || dot <= 0 ? name.length : dot
}

type DraftInputProps = {
  readonly label: string
  readonly initialName: string
  readonly selection: number
  readonly issue: string | undefined
  readonly depth: number
  readonly onChange: (name: string) => void
  readonly onSubmit: (name: string) => void
  readonly onBlur: (name: string) => void
  readonly onCancel: () => void
}

const DraftInput = ({
  label,
  initialName,
  selection,
  issue,
  depth,
  onChange,
  onSubmit,
  onBlur,
  onCancel,
}: DraftInputProps) => {
  const input = useRef<HTMLInputElement>(null)
  const messageId = useId()

  useEffect(() => {
    input.current?.focus()
    input.current?.setSelectionRange(0, selection)
  }, [])

  return (
    <li role="none" className="py-0.5 pr-2" style={indentOf(depth)}>
      <input
        ref={input}
        type="text"
        aria-label={label}
        aria-invalid={issue !== undefined}
        aria-describedby={issue === undefined ? undefined : messageId}
        defaultValue={initialName}
        spellCheck={false}
        autoComplete="off"
        className="min-h-target w-full rounded-sm border border-border-strong bg-surface-raised px-2 text-compact text-fg outline-none focus-visible:outline-3 focus-visible:outline-offset-[-1px] focus-visible:outline-focus-ring aria-invalid:border-danger-border"
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onBlur(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.preventDefault()
            onSubmit(event.currentTarget.value)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
      />
      {issue === undefined ? null : (
        <p id={messageId} role="alert" className="mt-1 text-sm whitespace-normal text-danger-text">
          {issue}
        </p>
      )}
    </li>
  )
}

const CreateGlyph = ({ isFolder }: { readonly isFolder: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      d={
        isFolder
          ? 'M1.75 3.25v9.5h7.5 M1.75 3.25h3.5l1.5 1.5h7.5v3.5'
          : 'M8.75 14.25h-5.5V1.75h5l3.5 3.5v2.5 M8.25 1.75v3.5h3.5'
      }
      strokeLinejoin="round"
    />
    <path d="M12.5 9.75v5 M10 12.25h5" strokeLinecap="round" />
  </svg>
)

type DeleteDialogProps = {
  readonly deletion: FileTreeDeletion | undefined
  readonly finalFocus: () => HTMLElement | false
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

const DeleteDialog = ({ deletion, finalFocus, onConfirm, onCancel }: DeleteDialogProps) => {
  const { t } = useTranslation('project')
  const [shown, setShown] = useState(deletion)
  if (deletion !== undefined && deletion !== shown) setShown(deletion)
  const description = (() => {
    if (shown === undefined) return null
    if (shown.files.length === 0) return t('tree.deletion.emptyFolder')
    return t(shown.isFolder ? 'tree.deletion.folder' : 'tree.deletion.file')
  })()
  return (
    <AlertDialog
      open={deletion !== undefined}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogPopup finalFocus={finalFocus}>
        <AlertDialogTitle>{t('tree.deletion.title', { name: nameOf(shown?.path ?? '') })}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <ul className="max-h-48 overflow-auto font-mono text-base">
          {shown?.files.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogClose render={<Button />}>{t('tree.deletion.cancel')}</AlertDialogClose>
          <Button variant="primary" onClick={onConfirm}>
            {t('tree.deletion.confirm')}
          </Button>
        </div>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

type HeaderButtonProps = { readonly label: string; readonly onClick: () => void; readonly children: ReactNode }

const HeaderButton = ({ label, onClick, children }: HeaderButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className="inline-flex size-target items-center justify-center rounded-sm text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-3 focus-visible:outline-focus-ring"
    onClick={onClick}
  >
    {children}
  </button>
)

export const FileTree = ({ nodes, selectedPath, modifiedPaths, onSelect, editing }: FileTreeProps) => {
  const { t } = useTranslation('project')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [focusedPath, setFocusedPath] = useState<string | undefined>(undefined)
  const [pendingFocus, setPendingFocus] = useState<string | undefined>(undefined)
  const [seenFocusRequest, setSeenFocusRequest] = useState(editing?.focusRequest)
  const [seenDraft, setSeenDraft] = useState(editing?.draft)
  const [menuTarget, setMenuTarget] = useState<TreeItemRef | undefined>(undefined)
  const [dragged, setDragged] = useState<TreeItemRef | undefined>(undefined)
  const [dropFolder, setDropFolder] = useState<string | undefined>(undefined)
  const isMenuActionChosen = useRef(false)
  const items = useRef(new Map<string, HTMLLIElement>())

  const draft = editing?.draft
  if (editing?.focusRequest !== seenFocusRequest) {
    setSeenFocusRequest(editing?.focusRequest)
    if (editing?.focusRequest !== undefined) {
      setPendingFocus(editing.focusRequest.path)
      const hidden = ancestorsOf(editing.focusRequest.path).filter((folder) => collapsed.has(folder))
      if (hidden.length > 0) setCollapsed(new Set([...collapsed].filter((folder) => !hidden.includes(folder))))
    }
  }
  if (draft !== seenDraft) {
    setSeenDraft(draft)
    if (draft?._tag === 'Create' && collapsed.has(draft.parentPath)) {
      const next = new Set(collapsed)
      next.delete(draft.parentPath)
      setCollapsed(next)
    }
  }

  const visible = visibleItems(nodes, collapsed)
  const isVisible = (path: string | undefined) => visible.some((item) => item.node.path === path)
  const tabStop = isVisible(focusedPath) ? focusedPath : isVisible(selectedPath) ? selectedPath : visible[0]?.node.path
  const tabStopItem = refOf(visible.find((item) => item.node.path === tabStop)?.node)

  useEffect(() => {
    if (pendingFocus === undefined) return
    const element = items.current.get(pendingFocus)
    if (element === undefined) return
    setPendingFocus(undefined)
    setFocusedPath(pendingFocus)
    element.focus()
  })

  const focus = (path: string | undefined) => {
    if (path === undefined) return
    setFocusedPath(path)
    items.current.get(path)?.focus()
  }

  const toggle = (path: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (!next.delete(path)) next.add(path)
      return next
    })

  const activate = (node: FileTreeNode) => (node._tag === 'File' ? onSelect(node.path) : toggle(node.path))

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!(event.target instanceof HTMLLIElement)) return
    const path = event.target.dataset.path
    const index = visible.findIndex((item) => item.node.path === path)
    const current = visible[index]
    if (current === undefined) return
    const { node } = current
    const expanded = node._tag === 'Folder' && !collapsed.has(node.path)
    switch (event.key) {
      case 'ArrowDown':
        focus(visible[index + 1]?.node.path)
        break
      case 'ArrowUp':
        focus(visible[index - 1]?.node.path)
        break
      case 'Home':
        focus(visible[0]?.node.path)
        break
      case 'End':
        focus(visible.at(-1)?.node.path)
        break
      case 'ArrowRight':
        if (node._tag === 'Folder') {
          if (expanded) focus(node.children[0]?.path)
          else toggle(node.path)
        }
        break
      case 'ArrowLeft':
        if (expanded) toggle(node.path)
        else focus(current.parentPath)
        break
      case 'Enter':
      case ' ':
        activate(node)
        break
      case 'F2':
        if (editing === undefined) return
        editing.onRename(node.path, node._tag === 'Folder')
        break
      case 'Backspace':
      case 'Delete':
        if (editing === undefined || (event.key === 'Backspace' && !event.metaKey)) return
        setFocusedPath(node.path)
        editing.onDelete(node.path, node._tag === 'Folder')
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  const dropFolderAt = (event: DragEvent<HTMLElement>) => {
    if (dragged === undefined || !event.dataTransfer.types.includes(DRAG_TYPE)) return undefined
    const folder = creationFolderOf(itemAt(event.target))
    if (folder === parentOf(dragged.path) || (dragged.isFolder && isWithin(folder, dragged.path))) return undefined
    return folder
  }

  const endDrag = () => {
    setDragged(undefined)
    setDropFolder(undefined)
  }

  const dragHandlers =
    editing === undefined
      ? {}
      : {
          onDragStart: (event: DragEvent<HTMLUListElement>) => {
            const item = itemAt(event.target)
            if (item === undefined || !isEditable(item.path)) return
            event.dataTransfer.setData(DRAG_TYPE, item.path)
            event.dataTransfer.effectAllowed = 'move'
            setDragged(item)
          },
          onDragOver: (event: DragEvent<HTMLUListElement>) => {
            const folder = dropFolderAt(event)
            if (folder !== dropFolder) setDropFolder(folder)
            if (folder === undefined) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          },
          onDragLeave: (event: DragEvent<HTMLUListElement>) => {
            if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)))
              setDropFolder(undefined)
          },
          onDrop: (event: DragEvent<HTMLUListElement>) => {
            const folder = dropFolderAt(event)
            if (folder !== undefined && dragged !== undefined) {
              event.preventDefault()
              editing.onMoveTo(dragged, folder)
            }
            endDrag()
          },
          onDragEnd: endDrag,
        }

  const issueText = editing?.issue === undefined ? undefined : t(`tree.issues.${editing.issue}`)

  const draftInput = (depth: number) => {
    if (editing === undefined || draft === undefined) return null
    const isRename = draft._tag === 'Rename'
    const initialName = isRename ? nameOf(draft.path) : ''
    return (
      <DraftInput
        key={isRename ? `rename:${draft.path}` : `create:${draft.parentPath}`}
        label={
          isRename
            ? t('tree.renameName', { name: initialName })
            : t(draft.kind === 'file' ? 'tree.newFileName' : 'tree.newFolderName')
        }
        initialName={initialName}
        selection={stemLength(initialName, isRename && draft.isFolder)}
        issue={issueText}
        depth={depth}
        onChange={editing.onDraftChange}
        onSubmit={editing.onDraftSubmit}
        onBlur={editing.onDraftBlur}
        onCancel={() => {
          setPendingFocus(isRename ? draft.path : draft.parentPath === '' ? tabStop : draft.parentPath)
          editing.onDraftCancel()
        }}
      />
    )
  }

  const createsIn = (path: string) => draft?._tag === 'Create' && draft.parentPath === path

  const renderNode = (node: FileTreeNode, depth: number): ReactNode => {
    const isFolder = node._tag === 'Folder'
    const isExpanded = isFolder && !collapsed.has(node.path)
    const isSelected = node.path === selectedPath
    const isModified = !isFolder && modifiedPaths.includes(node.path)
    const isDropTarget = isFolder && node.path === dropFolder
    const children =
      isFolder && isExpanded ? (
        <ul role="group">
          {createsIn(node.path) ? draftInput(depth + 1) : null}
          {node.children.map((child) => renderNode(child, depth + 1))}
        </ul>
      ) : null
    if (draft?._tag === 'Rename' && draft.path === node.path)
      return (
        <li key={node.path} role="none">
          <ul role="none">{draftInput(depth)}</ul>
          {children}
        </li>
      )
    const label = (() => {
      if (isModified) return t('tree.modifiedItem', { name: node.name })
      if (!isFolder && isTypikaFile(node.path)) return t('tree.readOnlyItem', { name: node.name })
      return node.name
    })()
    return (
      <li
        key={node.path}
        ref={(element) => {
          if (element === null) items.current.delete(node.path)
          else items.current.set(node.path, element)
        }}
        role="treeitem"
        data-path={node.path}
        data-folder={isFolder}
        data-drop-target={isDropTarget ? true : undefined}
        draggable={editing !== undefined && draft === undefined && isEditable(node.path)}
        tabIndex={node.path === tabStop ? 0 : -1}
        aria-label={label}
        {...(isFolder ? { 'aria-expanded': isExpanded } : { 'aria-selected': isSelected })}
        className="outline-none [&:focus-visible>div]:outline-3 [&:focus-visible>div]:outline-offset-[-3px] [&:focus-visible>div]:outline-focus-ring"
        onClick={(event) => {
          event.stopPropagation()
          setFocusedPath(node.path)
          activate(node)
        }}
        onDoubleClick={(event) => {
          if (editing === undefined) return
          event.stopPropagation()
          editing.onRename(node.path, isFolder)
        }}
      >
        <div
          className={`${ROW} ${isSelected ? 'bg-selected-bg font-semibold text-selected-fg' : 'hover:bg-surface-muted'} ${isDropTarget ? 'outline-2 outline-offset-[-2px] outline-focus-ring outline-dashed' : ''} ${dragged?.path === node.path ? 'opacity-60' : ''}`}
          style={indentOf(depth)}
        >
          <span aria-hidden="true" className="w-3 shrink-0 text-fg-subtle">
            {isFolder ? (isExpanded ? '▾' : '▸') : ''}
          </span>
          {isFolder ? (
            <FolderIcon isOpen={isExpanded} isTypika={node.path === TYPIKA_GROUP_PATH} />
          ) : (
            <FileIcon path={node.path} />
          )}
          <span className="pl-0.5">{node.name}</span>
          {isModified ? (
            <span aria-hidden="true" className="ml-auto pl-2 text-sm text-modified">
              ●
            </span>
          ) : null}
        </div>
        {children}
      </li>
    )
  }

  const tree = (
    <ul
      role="tree"
      aria-label={t('tree.label')}
      className={`min-h-full flex-1 py-2 ${dropFolder === '' ? 'outline-2 outline-offset-[-2px] outline-focus-ring outline-dashed' : ''}`}
      onKeyDown={handleKeyDown}
      onContextMenu={(event: MouseEvent<HTMLUListElement>) => {
        const item = itemAt(event.target)
        isMenuActionChosen.current = false
        setMenuTarget(item)
        if (item !== undefined) setFocusedPath(item.path)
      }}
      {...dragHandlers}
    >
      {createsIn('') ? draftInput(0) : null}
      {nodes.map((node) => renderNode(node, 0))}
    </ul>
  )

  if (editing === undefined) return tree

  const neighbourOf = (path: string) => {
    const index = visible.findIndex((item) => item.node.path === path)
    const next = visible.slice(index + 1).find((item) => !isWithin(item.node.path, path))
    return (next ?? visible[index - 1])?.node.path
  }

  const chosen = (action: () => void) => () => {
    isMenuActionChosen.current = true
    action()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border py-1 pr-1 pl-3">
        <span className="flex-1 text-sm font-semibold text-fg-muted">{t('tree.label')}</span>
        <HeaderButton label={t('tree.newFile')} onClick={() => editing.onCreate('file', tabStopItem)}>
          <CreateGlyph isFolder={false} />
        </HeaderButton>
        <HeaderButton label={t('tree.newFolder')} onClick={() => editing.onCreate('folder', tabStopItem)}>
          <CreateGlyph isFolder />
        </HeaderButton>
      </div>
      <p role="status" className="px-3 text-sm text-danger-text empty:hidden">
        {draft === undefined && editing.moving === undefined ? issueText : undefined}
      </p>
      <ContextMenu
        trigger={tree}
        finalFocus={() => (isMenuActionChosen.current ? false : (items.current.get(menuTarget?.path ?? '') ?? true))}
        items={[
          { label: t('tree.newFile'), onSelect: chosen(() => editing.onCreate('file', menuTarget)) },
          { label: t('tree.newFolder'), onSelect: chosen(() => editing.onCreate('folder', menuTarget)) },
          {
            label: t('tree.rename'),
            disabled: menuTarget === undefined || !isEditable(menuTarget.path),
            onSelect: chosen(() => {
              if (menuTarget !== undefined) editing.onRename(menuTarget.path, menuTarget.isFolder)
            }),
          },
          {
            label: t('tree.move'),
            disabled: menuTarget === undefined || !isEditable(menuTarget.path),
            onSelect: chosen(() => {
              if (menuTarget !== undefined) editing.onMoveStart(menuTarget.path, menuTarget.isFolder)
            }),
          },
          {
            label: t('tree.delete'),
            disabled: menuTarget === undefined || !isEditable(menuTarget.path),
            onSelect: chosen(() => {
              if (menuTarget !== undefined) editing.onDelete(menuTarget.path, menuTarget.isFolder)
            }),
          },
        ]}
      />
      <DeleteDialog
        deletion={editing.deletion}
        finalFocus={() => items.current.get(tabStop ?? '') ?? false}
        onConfirm={() => {
          if (editing.deletion !== undefined) setPendingFocus(neighbourOf(editing.deletion.path))
          editing.onDeleteConfirm()
        }}
        onCancel={editing.onDeleteCancel}
      />
      <MoveDialog
        moving={editing.moving}
        issue={editing.moving === undefined ? undefined : issueText}
        onMove={editing.onMoveTo}
        onCancel={editing.onMoveCancel}
      />
    </div>
  )
}
