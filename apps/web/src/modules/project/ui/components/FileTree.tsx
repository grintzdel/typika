import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ContextMenu } from '../../../../ui/ContextMenu.tsx'
import {
  isRenamable,
  nameOf,
  type FileNameIssue,
  type FileTreeDraft,
  type TreeItemRef,
} from '../../core/domain/file-operations.domain-model.ts'
import { isTypikaFile, type FileTreeNode } from '../../core/domain/file-tree.domain-model.ts'

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
  const isMenuActionChosen = useRef(false)
  const items = useRef(new Map<string, HTMLLIElement>())

  const draft = editing?.draft
  if (editing?.focusRequest !== seenFocusRequest) {
    setSeenFocusRequest(editing?.focusRequest)
    if (editing?.focusRequest !== undefined) setPendingFocus(editing.focusRequest.path)
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
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
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
          className={`${ROW} ${isSelected ? 'bg-selected-bg font-semibold text-selected-fg' : 'hover:bg-surface-muted'}`}
          style={indentOf(depth)}
        >
          <span aria-hidden="true" className="w-3 text-fg-subtle">
            {isFolder ? (isExpanded ? '▾' : '▸') : ''}
          </span>
          <span>{node.name}</span>
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
      className="py-2"
      onKeyDown={handleKeyDown}
      onContextMenu={(event: MouseEvent<HTMLUListElement>) => {
        const item = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-path]') : null
        const path = item?.dataset.path
        isMenuActionChosen.current = false
        setMenuTarget(path === undefined ? undefined : { path, isFolder: item?.dataset.folder === 'true' })
        if (path !== undefined) setFocusedPath(path)
      }}
    >
      {createsIn('') ? draftInput(0) : null}
      {nodes.map((node) => renderNode(node, 0))}
    </ul>
  )

  if (editing === undefined) return tree

  const chosen = (action: () => void) => () => {
    isMenuActionChosen.current = true
    action()
  }

  return (
    <div className="flex flex-col">
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
        {draft === undefined ? issueText : undefined}
      </p>
      <ContextMenu
        trigger={tree}
        finalFocus={() => (isMenuActionChosen.current ? false : (items.current.get(menuTarget?.path ?? '') ?? true))}
        items={[
          { label: t('tree.newFile'), onSelect: chosen(() => editing.onCreate('file', menuTarget)) },
          { label: t('tree.newFolder'), onSelect: chosen(() => editing.onCreate('folder', menuTarget)) },
          {
            label: t('tree.rename'),
            disabled: menuTarget === undefined || !isRenamable(menuTarget.path),
            onSelect: chosen(() => {
              if (menuTarget !== undefined) editing.onRename(menuTarget.path, menuTarget.isFolder)
            }),
          },
        ]}
      />
    </div>
  )
}
