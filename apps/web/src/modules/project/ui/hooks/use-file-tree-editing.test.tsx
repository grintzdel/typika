import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FileNameIssue } from '../../core/domain/file-operations.domain-model.ts'
import { buildFileTree } from '../../core/domain/file-tree.domain-model.ts'
import { useFileTreeEditing } from './use-file-tree-editing.ts'

const PATHS = ['src/main.ts', 'src/shop/money.ts', 'src/shop/order.ts', 'typika.toml']

const renderEditing = (paths: ReadonlyArray<string> = PATHS) => {
  const onCreateFile = vi.fn()
  const onMove = vi.fn()
  const rendered = renderHook(() => useFileTreeEditing({ paths, onCreateFile, onMove }))
  return { ...rendered, onCreateFile, onMove }
}

describe('useFileTreeEditing', () => {
  it('builds the tree of the project files', () => {
    const { result } = renderEditing()

    expect(result.current.nodes).toEqual(buildFileTree(PATHS))
  })

  it('creates a file in the folder it was asked from, then asks to focus it', () => {
    const { result, onCreateFile } = renderEditing()

    act(() => result.current.editing.onCreate('file', { path: 'src/shop', isFolder: true }))
    expect(result.current.editing.draft).toEqual({ _tag: 'Create', kind: 'file', parentPath: 'src/shop' })
    act(() => result.current.editing.onDraftSubmit('tax.ts'))

    expect(onCreateFile).toHaveBeenCalledExactlyOnceWith('src/shop/tax.ts')
    expect(result.current.editing.draft).toBeUndefined()
    expect(result.current.editing.focusRequest).toEqual({ path: 'src/shop/tax.ts' })
  })

  it('keeps the draft open with the reason a name is refused', () => {
    const { result, onCreateFile } = renderEditing()

    act(() => result.current.editing.onCreate('file', { path: 'src/main.ts', isFolder: false }))
    act(() => result.current.editing.onDraftSubmit('main.ts'))

    expect(onCreateFile).not.toHaveBeenCalled()
    expect(result.current.editing.draft).toEqual({ _tag: 'Create', kind: 'file', parentPath: 'src' })
    expect(result.current.editing.issue).toBe(FileNameIssue.TAKEN)
  })

  it('checks the name while it is typed, without blaming an empty one', () => {
    const { result } = renderEditing()

    act(() => result.current.editing.onCreate('file', undefined))
    act(() => result.current.editing.onDraftChange('a/b'))
    expect(result.current.editing.issue).toBe(FileNameIssue.INVALID)
    act(() => result.current.editing.onDraftChange(''))
    expect(result.current.editing.issue).toBeUndefined()
    act(() => result.current.editing.onDraftSubmit(''))
    expect(result.current.editing.issue).toBe(FileNameIssue.EMPTY)
  })

  it('shows a created folder until it is filled, and creates files in it', () => {
    const { result, onCreateFile } = renderEditing()

    act(() => result.current.editing.onCreate('folder', undefined))
    act(() => result.current.editing.onDraftSubmit('docs'))
    expect(result.current.nodes[0]).toEqual({ _tag: 'Folder', name: 'docs', path: 'docs', children: [] })
    expect(result.current.editing.focusRequest).toEqual({ path: 'docs' })

    act(() => result.current.editing.onCreate('file', { path: 'docs', isFolder: true }))
    act(() => result.current.editing.onDraftSubmit('guide.md'))
    expect(onCreateFile).toHaveBeenCalledExactlyOnceWith('docs/guide.md')
  })

  it('moves a renamed file', () => {
    const { result, onMove } = renderEditing()

    act(() => result.current.editing.onRename('src/main.ts', false))
    expect(result.current.editing.draft).toEqual({ _tag: 'Rename', path: 'src/main.ts', isFolder: false })
    act(() => result.current.editing.onDraftSubmit('app.ts'))

    expect(onMove).toHaveBeenCalledExactlyOnceWith([['src/main.ts', 'src/app.ts']])
    expect(result.current.editing.focusRequest).toEqual({ path: 'src/app.ts' })
  })

  it('moves every file of a renamed folder', () => {
    const { result, onMove } = renderEditing()

    act(() => result.current.editing.onRename('src/shop', true))
    act(() => result.current.editing.onDraftSubmit('store'))

    expect(onMove).toHaveBeenCalledExactlyOnceWith([
      ['src/shop/money.ts', 'src/store/money.ts'],
      ['src/shop/order.ts', 'src/store/order.ts'],
    ])
  })

  it('renames an empty folder in the tree alone', () => {
    const { result, onMove } = renderEditing()
    act(() => result.current.editing.onCreate('folder', undefined))
    act(() => result.current.editing.onDraftSubmit('docs'))

    act(() => result.current.editing.onRename('docs', true))
    act(() => result.current.editing.onDraftSubmit('guides'))

    expect(onMove).not.toHaveBeenCalled()
    expect(result.current.nodes[0]).toEqual({ _tag: 'Folder', name: 'guides', path: 'guides', children: [] })
  })

  it('closes the draft without moving anything when the name is unchanged', () => {
    const { result, onMove } = renderEditing()

    act(() => result.current.editing.onRename('src/main.ts', false))
    act(() => result.current.editing.onDraftSubmit('main.ts'))

    expect(onMove).not.toHaveBeenCalled()
    expect(result.current.editing.draft).toBeUndefined()
  })

  it('refuses to rename a read-only file', () => {
    const { result } = renderEditing()

    act(() => result.current.editing.onRename('typika.toml', false))

    expect(result.current.editing.draft).toBeUndefined()
    expect(result.current.editing.issue).toBe(FileNameIssue.READ_ONLY)
  })

  it('submits a valid name on blur, and drops an invalid one', () => {
    const { result, onCreateFile } = renderEditing()

    act(() => result.current.editing.onCreate('file', undefined))
    act(() => result.current.editing.onDraftBlur('src'))
    expect(result.current.editing.draft).toBeUndefined()
    expect(result.current.editing.issue).toBeUndefined()

    act(() => result.current.editing.onCreate('file', undefined))
    act(() => result.current.editing.onDraftBlur('NOTES.md'))
    expect(onCreateFile).toHaveBeenCalledExactlyOnceWith('NOTES.md')
  })

  it('cancels the draft', () => {
    const { result } = renderEditing()

    act(() => result.current.editing.onCreate('file', undefined))
    act(() => result.current.editing.onDraftCancel())

    expect(result.current.editing.draft).toBeUndefined()
  })

  it('forgets the empty folders on reset', () => {
    const { result } = renderEditing()
    act(() => result.current.editing.onCreate('folder', undefined))
    act(() => result.current.editing.onDraftSubmit('docs'))

    act(() => result.current.handleReset())

    expect(result.current.nodes).toEqual(buildFileTree(PATHS))
  })
})
