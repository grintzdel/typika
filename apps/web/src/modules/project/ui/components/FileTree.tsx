import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { isTypikaFile, type FileTreeNode } from '../../core/domain/file-tree.domain-model.ts'

export type FileTreeProps = {
  readonly nodes: ReadonlyArray<FileTreeNode>
  readonly selectedPath: string | undefined
  readonly modifiedPaths: ReadonlyArray<string>
  readonly onSelect: (path: string) => void
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

const ROW = 'flex cursor-pointer items-center gap-1 rounded py-0.5 pr-2 text-sm whitespace-nowrap'

export const FileTree = ({ nodes, selectedPath, modifiedPaths, onSelect }: FileTreeProps) => {
  const { t } = useTranslation('project')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [focusedPath, setFocusedPath] = useState<string | undefined>(undefined)
  const items = useRef(new Map<string, HTMLLIElement>())

  const visible = visibleItems(nodes, collapsed)
  const isVisible = (path: string | undefined) => visible.some((item) => item.node.path === path)
  const tabStop = isVisible(focusedPath) ? focusedPath : isVisible(selectedPath) ? selectedPath : visible[0]?.node.path

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
    const path = event.target instanceof HTMLElement ? event.target.dataset.path : undefined
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
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  const renderNode = (node: FileTreeNode, depth: number) => {
    const isFolder = node._tag === 'Folder'
    const isExpanded = isFolder && !collapsed.has(node.path)
    const isSelected = node.path === selectedPath
    const isModified = !isFolder && modifiedPaths.includes(node.path)
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
        tabIndex={node.path === tabStop ? 0 : -1}
        aria-label={label}
        {...(isFolder ? { 'aria-expanded': isExpanded } : { 'aria-selected': isSelected })}
        className="outline-none [&:focus-visible>div]:outline-2 [&:focus-visible>div]:outline-sky-600"
        onClick={(event) => {
          event.stopPropagation()
          setFocusedPath(node.path)
          activate(node)
        }}
      >
        <div
          className={`${ROW} ${isSelected ? 'bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        >
          <span aria-hidden="true" className="w-3 text-neutral-500">
            {isFolder ? (isExpanded ? '▾' : '▸') : ''}
          </span>
          <span>{node.name}</span>
          {isModified ? (
            <span aria-hidden="true" className="ml-auto pl-2 text-xs text-amber-600 dark:text-amber-400">
              ●
            </span>
          ) : null}
        </div>
        {isFolder && isExpanded ? (
          <ul role="group">{node.children.map((child) => renderNode(child, depth + 1))}</ul>
        ) : null}
      </li>
    )
  }

  return (
    <ul role="tree" aria-label={t('tree.label')} className="py-2" onKeyDown={handleKeyDown}>
      {nodes.map((node) => renderNode(node, 0))}
    </ul>
  )
}
