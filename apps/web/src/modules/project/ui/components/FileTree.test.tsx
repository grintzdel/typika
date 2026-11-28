import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FileNameIssue } from '../../core/domain/file-operations.domain-model.ts'
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import { FileTree, type FileTreeEditing } from './FileTree.tsx'

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

const makeEditing = (overrides: Partial<FileTreeEditing> = {}): FileTreeEditing => ({
  draft: undefined,
  issue: undefined,
  focusRequest: undefined,
  onCreate: vi.fn(),
  onRename: vi.fn(),
  onDraftChange: vi.fn(),
  onDraftSubmit: vi.fn(),
  onDraftBlur: vi.fn(),
  onDraftCancel: vi.fn(),
  deletion: undefined,
  onDelete: vi.fn(),
  onDeleteConfirm: vi.fn(),
  onDeleteCancel: vi.fn(),
  moving: undefined,
  onMoveStart: vi.fn(),
  onMoveTo: vi.fn(),
  onMoveCancel: vi.fn(),
  ...overrides,
})

const fakeDataTransfer = () => {
  const data = new Map<string, string>()
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    get types() {
      return [...data.keys()]
    },
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
  }
}

const renderEditable = (editing: FileTreeEditing, paths = ['src/main.ts', 'src/shop/money.ts', 'typika.toml']) =>
  render(
    <FileTree
      nodes={buildFileTree(paths)}
      selectedPath="src/main.ts"
      modifiedPaths={[]}
      onSelect={vi.fn()}
      editing={editing}
    />
  )

describe('FileTree editing', () => {
  it('creates a file or a folder next to the item holding the tab stop', () => {
    const editing = makeEditing()
    renderEditable(editing)

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau fichier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau dossier' }))

    expect(editing.onCreate).toHaveBeenNthCalledWith(1, 'file', { path: 'src/main.ts', isFolder: false })
    expect(editing.onCreate).toHaveBeenNthCalledWith(2, 'folder', { path: 'src/main.ts', isFolder: false })
  })

  it('asks for the name of a new file inside its folder, focused', () => {
    renderEditable(makeEditing({ draft: { _tag: 'Create', kind: 'file', parentPath: 'src/shop' } }))

    const input = screen.getByRole('textbox', { name: 'Nom du nouveau fichier' })
    expect(document.activeElement).toBe(input)
    expect(input.closest('[role="group"]')?.parentElement?.dataset.path).toBe('src/shop')
  })

  it('asks for the name of a new folder at the root', () => {
    renderEditable(makeEditing({ draft: { _tag: 'Create', kind: 'folder', parentPath: '' } }))

    const input = screen.getByRole('textbox', { name: 'Nom du nouveau dossier' })
    expect(input.closest('[role="tree"]')).toBeTruthy()
    expect(input.closest('[role="group"]')).toBeNull()
  })

  it('submits the typed name with Enter and cancels with Escape', () => {
    const editing = makeEditing({ draft: { _tag: 'Create', kind: 'file', parentPath: 'src' } })
    renderEditable(editing)
    const input = screen.getByRole('textbox', { name: 'Nom du nouveau fichier' })

    fireEvent.change(input, { target: { value: 'tax.ts' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(editing.onDraftChange).toHaveBeenCalledWith('tax.ts')
    expect(editing.onDraftSubmit).toHaveBeenCalledWith('tax.ts')
    expect(editing.onDraftCancel).toHaveBeenCalledOnce()
  })

  it('hands the name over when the input loses the focus', () => {
    const editing = makeEditing({ draft: { _tag: 'Create', kind: 'file', parentPath: 'src' } })
    renderEditable(editing)
    const input = screen.getByRole('textbox', { name: 'Nom du nouveau fichier' })

    fireEvent.change(input, { target: { value: 'tax.ts' } })
    fireEvent.blur(input)

    expect(editing.onDraftBlur).toHaveBeenCalledWith('tax.ts')
  })

  it('keeps the tree keys away from the name being typed', () => {
    const editing = makeEditing({ draft: { _tag: 'Create', kind: 'file', parentPath: 'src' } })
    renderEditable(editing)
    const input = screen.getByRole('textbox', { name: 'Nom du nouveau fichier' })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'F2' })

    expect(document.activeElement).toBe(input)
    expect(editing.onRename).not.toHaveBeenCalled()
  })

  it('explains why a name is refused, next to the input', () => {
    renderEditable(
      makeEditing({ draft: { _tag: 'Create', kind: 'file', parentPath: 'src' }, issue: FileNameIssue.TAKEN })
    )

    const input = screen.getByRole('textbox', { name: 'Nom du nouveau fichier' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const message = document.getElementById(input.getAttribute('aria-describedby') ?? '')
    expect(message?.textContent).toBe('Un fichier ou un dossier porte déjà ce nom.')
  })

  it('renames the focused item with F2 or a double click', () => {
    const editing = makeEditing()
    renderEditable(editing)
    const shop = screen.getByRole('treeitem', { name: 'shop' })

    shop.focus()
    fireEvent.keyDown(shop, { key: 'F2' })
    fireEvent.doubleClick(screen.getByRole('treeitem', { name: 'money.ts' }))

    expect(editing.onRename).toHaveBeenNthCalledWith(1, 'src/shop', true)
    expect(editing.onRename).toHaveBeenNthCalledWith(2, 'src/shop/money.ts', false)
  })

  it('asks for the new name in place of the renamed item, its stem selected', () => {
    renderEditable(makeEditing({ draft: { _tag: 'Rename', path: 'src/shop/money.ts', isFolder: false } }))

    const input = screen.getByRole('textbox', { name: 'Nouveau nom de money.ts' })
    expect(input instanceof HTMLInputElement && input.value).toBe('money.ts')
    expect(document.activeElement).toBe(input)
    expect(input instanceof HTMLInputElement && [input.selectionStart, input.selectionEnd]).toEqual([0, 5])
    expect(screen.queryByRole('treeitem', { name: 'money.ts' })).toBeNull()
  })

  it('tells why an item cannot be renamed', () => {
    renderEditable(makeEditing({ issue: FileNameIssue.READ_ONLY }))

    expect(screen.getByRole('status').textContent).toBe(
      'Ce fichier est en lecture seule : il ne peut être ni renommé, ni déplacé, ni supprimé.'
    )
  })

  it('moves the focus to the item an operation asked for', async () => {
    const { rerender } = renderEditable(makeEditing())

    rerender(
      <FileTree
        nodes={buildFileTree(['src/main.ts', 'src/shop/money.ts', 'src/tax.ts'])}
        selectedPath="src/main.ts"
        modifiedPaths={[]}
        onSelect={vi.fn()}
        editing={makeEditing({ focusRequest: { path: 'src/tax.ts' } })}
      />
    )

    await waitFor(() => expect(document.activeElement?.getAttribute('data-path')).toBe('src/tax.ts'))
  })

  it('offers the file actions of an item in its context menu', async () => {
    const editing = makeEditing()
    renderEditable(editing)

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: 'shop' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Nouveau fichier' }))
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: 'shop' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Renommer' }))

    expect(editing.onCreate).toHaveBeenCalledWith('file', { path: 'src/shop', isFolder: true })
    expect(editing.onRename).toHaveBeenCalledWith('src/shop', true)
  })

  it('disables the renaming and the deletion of a Typika file in its context menu', async () => {
    renderEditable(makeEditing())

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: 'typika.toml, lecture seule' }))

    expect((await screen.findByRole('menuitem', { name: 'Renommer' })).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('menuitem', { name: 'Supprimer' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('deletes the focused item with Delete or Cmd+Backspace', () => {
    const editing = makeEditing()
    renderEditable(editing)
    const shop = screen.getByRole('treeitem', { name: 'shop' })
    const money = screen.getByRole('treeitem', { name: 'money.ts' })

    shop.focus()
    fireEvent.keyDown(shop, { key: 'Delete' })
    money.focus()
    fireEvent.keyDown(money, { key: 'Backspace' })
    fireEvent.keyDown(money, { key: 'Backspace', metaKey: true })

    expect(editing.onDelete).toHaveBeenCalledTimes(2)
    expect(editing.onDelete).toHaveBeenNthCalledWith(1, 'src/shop', true)
    expect(editing.onDelete).toHaveBeenNthCalledWith(2, 'src/shop/money.ts', false)
  })

  it('deletes an item from its context menu', async () => {
    const editing = makeEditing()
    renderEditable(editing)

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: 'money.ts' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Supprimer' }))

    expect(editing.onDelete).toHaveBeenCalledWith('src/shop/money.ts', false)
  })

  it('asks to confirm the deletion of a folder, listing its files', async () => {
    const editing = makeEditing({
      deletion: { path: 'src/shop', isFolder: true, files: ['src/shop/money.ts', 'src/shop/order.ts'] },
    })
    renderEditable(editing)

    const dialog = await screen.findByRole('alertdialog', { name: 'Supprimer « shop » ?' })
    expect(dialog.textContent).toContain('src/shop/money.ts')
    expect(dialog.textContent).toContain('src/shop/order.ts')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    expect(editing.onDeleteConfirm).toHaveBeenCalledOnce()
  })

  it('cancels a deletion', async () => {
    const editing = makeEditing({ deletion: { path: 'src/main.ts', isFolder: false, files: ['src/main.ts'] } })
    renderEditable(editing)

    const dialog = await screen.findByRole('alertdialog', { name: 'Supprimer « main.ts » ?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(editing.onDeleteCancel).toHaveBeenCalledOnce())
    expect(editing.onDeleteConfirm).not.toHaveBeenCalled()
  })

  it('moves an item from its context menu', async () => {
    const editing = makeEditing()
    renderEditable(editing)

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: 'money.ts' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Déplacer…' }))

    expect(editing.onMoveStart).toHaveBeenCalledWith('src/shop/money.ts', false)
  })

  it('disables the move of a Typika file in its context menu', async () => {
    renderEditable(makeEditing())

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: 'typika.toml, lecture seule' }))

    expect((await screen.findByRole('menuitem', { name: 'Déplacer…' })).getAttribute('aria-disabled')).toBe('true')
  })

  it('offers the folders an item can move to, the root first', async () => {
    const editing = makeEditing({ moving: { path: 'src/shop/money.ts', isFolder: false, folders: ['', 'src'] } })
    renderEditable(editing)

    const dialog = await screen.findByRole('dialog', { name: 'Déplacer « money.ts »' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Racine du projet' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'src' }))

    expect(editing.onMoveTo).toHaveBeenNthCalledWith(1, { path: 'src/shop/money.ts', isFolder: false }, '')
    expect(editing.onMoveTo).toHaveBeenNthCalledWith(2, { path: 'src/shop/money.ts', isFolder: false }, 'src')
  })

  it('explains in the move dialog why a folder is refused, and cancels the move', async () => {
    const editing = makeEditing({
      moving: { path: 'src/main.ts', isFolder: false, folders: [''] },
      issue: FileNameIssue.TAKEN,
    })
    renderEditable(editing)

    const dialog = await screen.findByRole('dialog', { name: 'Déplacer « main.ts »' })
    expect(within(dialog).getByRole('alert').textContent).toBe('Un fichier ou un dossier porte déjà ce nom.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(editing.onMoveCancel).toHaveBeenCalledOnce())
  })

  it('moves a dragged item into the folder it is dropped on', () => {
    const editing = makeEditing()
    renderEditable(editing)
    const dataTransfer = fakeDataTransfer()

    fireEvent.dragStart(screen.getByRole('treeitem', { name: 'main.ts' }), { dataTransfer })
    fireEvent.dragOver(screen.getByRole('treeitem', { name: 'shop' }), { dataTransfer })
    expect(screen.getByRole('treeitem', { name: 'shop' }).dataset.dropTarget).toBe('true')
    fireEvent.drop(screen.getByRole('treeitem', { name: 'shop' }), { dataTransfer })

    expect(editing.onMoveTo).toHaveBeenCalledExactlyOnceWith({ path: 'src/main.ts', isFolder: false }, 'src/shop')
    expect(screen.getByRole('treeitem', { name: 'shop' }).dataset.dropTarget).toBeUndefined()
  })

  it('drops an item dragged onto a file into the folder of that file', () => {
    const editing = makeEditing()
    renderEditable(editing)
    const dataTransfer = fakeDataTransfer()

    fireEvent.dragStart(screen.getByRole('treeitem', { name: 'money.ts' }), { dataTransfer })
    fireEvent.drop(screen.getByRole('treeitem', { name: 'typika.toml, lecture seule' }), { dataTransfer })

    expect(editing.onMoveTo).toHaveBeenCalledExactlyOnceWith({ path: 'src/shop/money.ts', isFolder: false }, '')
  })

  it('keeps the Typika files from being dragged', () => {
    renderEditable(makeEditing())

    expect(screen.getByRole('treeitem', { name: 'typika.toml, lecture seule' }).getAttribute('draggable')).toBe('false')
    expect(screen.getByRole('treeitem', { name: 'main.ts' }).getAttribute('draggable')).toBe('true')
  })

  it('refuses to drop a folder inside itself', () => {
    const editing = makeEditing()
    renderEditable(editing)
    const dataTransfer = fakeDataTransfer()

    fireEvent.dragStart(screen.getByRole('treeitem', { name: 'src' }), { dataTransfer })
    const accepted = fireEvent.dragOver(screen.getByRole('treeitem', { name: 'money.ts' }), { dataTransfer })

    expect(accepted).toBe(true)
    expect(screen.getByRole('treeitem', { name: 'shop' }).dataset.dropTarget).toBeUndefined()
  })

  it('opens the folders on the way to a moved item', async () => {
    const editing = makeEditing()
    const { rerender } = renderEditable(editing)
    fireEvent.click(screen.getByRole('treeitem', { name: 'shop' }))

    rerender(
      <FileTree
        nodes={buildFileTree(['src/shop/main.ts', 'src/shop/money.ts', 'typika.toml'])}
        selectedPath={undefined}
        modifiedPaths={[]}
        onSelect={vi.fn()}
        editing={makeEditing({ focusRequest: { path: 'src/shop/main.ts' } })}
      />
    )

    await waitFor(() => expect(document.activeElement?.getAttribute('data-path')).toBe('src/shop/main.ts'))
  })

  it('moves the focus to the next item once the deleted one is gone', async () => {
    const paths = ['src/main.ts', 'src/shop/money.ts', 'typika.toml']
    const deletion = { path: 'src/shop', isFolder: true, files: ['src/shop/money.ts'] }
    const { rerender } = renderEditable(makeEditing({ deletion }), paths)

    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }))
    rerender(
      <FileTree
        nodes={buildFileTree(['src/main.ts', 'typika.toml'])}
        selectedPath={undefined}
        modifiedPaths={[]}
        onSelect={vi.fn()}
        editing={makeEditing()}
      />
    )

    await waitFor(() => expect(document.activeElement?.getAttribute('data-path')).toBe('src/main.ts'))
  })
})
