import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import { FileTree } from './FileTree.tsx'

const nodes = buildFileTree(['src/main.ts', 'src/shop/money.ts', 'README.md'])

const renderTree = (selectedPath = 'src/main.ts', modifiedPaths: ReadonlyArray<string> = []) => {
  const onSelect = vi.fn()
  render(<FileTree nodes={nodes} selectedPath={selectedPath} modifiedPaths={modifiedPaths} onSelect={onSelect} />)
  return { onSelect }
}

describe('FileTree', () => {
  it('shows the files in a labelled tree', () => {
    renderTree()

    expect(screen.getByRole('tree', { name: 'Fichiers' })).toBeTruthy()
    expect(screen.getByRole('treeitem', { name: 'money.ts' })).toBeTruthy()
  })

  it('marks the selected file', () => {
    renderTree('src/main.ts')

    expect(screen.getByRole('treeitem', { name: 'main.ts' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('treeitem', { name: 'README.md' }).getAttribute('aria-selected')).toBe('false')
  })

  it('marks the modified files', () => {
    renderTree('src/main.ts', ['src/shop/money.ts'])

    expect(screen.getByRole('treeitem', { name: 'money.ts, modifié' })).toBeTruthy()
    expect(screen.getByRole('treeitem', { name: 'main.ts' })).toBeTruthy()
  })

  it('selects a file on click', () => {
    const { onSelect } = renderTree()

    fireEvent.click(screen.getByRole('treeitem', { name: 'README.md' }))

    expect(onSelect).toHaveBeenCalledWith('README.md')
  })

  it('collapses a folder on click', () => {
    renderTree()

    fireEvent.click(screen.getByRole('treeitem', { name: 'shop' }))

    expect(screen.getByRole('treeitem', { name: 'shop' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('treeitem', { name: 'money.ts' })).toBeNull()
  })

  it('moves the focus with the arrow keys and selects with Enter', () => {
    const { onSelect } = renderTree()
    const main = screen.getByRole('treeitem', { name: 'main.ts' })

    main.focus()
    fireEvent.keyDown(main, { key: 'ArrowDown' })
    fireEvent.keyDown(document.activeElement ?? main, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith('README.md')
  })

  it('keeps a single tab stop on the selected file', () => {
    renderTree('src/main.ts')

    const tabbable = screen.getAllByRole('treeitem').filter((item) => item.tabIndex === 0)
    expect(tabbable.map((item) => item.textContent)).toEqual(['main.ts'])
  })

  it('marks the Typika files as read-only', () => {
    render(
      <FileTree
        nodes={buildFileTree(['src/main.ts', 'typika.toml'])}
        selectedPath="src/main.ts"
        modifiedPaths={[]}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByRole('treeitem', { name: 'typika.toml, lecture seule' })).toBeTruthy()
    expect(screen.getByRole('treeitem', { name: 'main.ts' })).toBeTruthy()
  })
})
