import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEditFiles } from './use-edit-files.ts'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const renderEdits = () => {
  const onPersist = vi.fn()
  const onSync = vi.fn()
  const onStructureChange = vi.fn()
  const rendered = renderHook(() => useEditFiles({ onPersist, onSync, onStructureChange }))
  return { ...rendered, onPersist, onSync, onStructureChange }
}

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useEditFiles', () => {
  it('persists and syncs the last content of each file after a pause', () => {
    const { result, onPersist, onSync } = renderEdits()

    act(() => {
      result.current.handleChange('src/a.ts', 'a1')
      result.current.handleChange('src/a.ts', 'a2')
      result.current.handleChange('src/b.ts', 'b1')
    })
    expect(onPersist).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    const edits = [
      ['src/a.ts', 'a2'],
      ['src/b.ts', 'b1'],
    ]
    expect(onPersist).toHaveBeenCalledExactlyOnceWith(edits)
    expect(onSync).toHaveBeenCalledExactlyOnceWith(edits)
  })

  it('persists the pending edits and hands them over on demand, without syncing them', () => {
    const { result, onPersist, onSync } = renderEdits()

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    const pending = result.current.commitPending()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(pending).toEqual([['src/a.ts', 'a1']])
    expect(onPersist).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
    expect(onSync).not.toHaveBeenCalled()
  })

  it('drops the pending edits on demand', () => {
    const { result, onPersist, onSync } = renderEdits()

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    result.current.discardPending()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onPersist).not.toHaveBeenCalled()
    expect(onSync).not.toHaveBeenCalled()
  })

  it('remembers the last content edited in each file, after the flush too', () => {
    const { result } = renderEdits()

    act(() => {
      result.current.handleChange('src/a.ts', 'a1')
      vi.advanceTimersByTime(300)
    })

    expect(result.current.editedContentOf('src/a.ts')).toBe('a1')
    expect(result.current.editedContentOf('src/b.ts')).toBeUndefined()
  })

  it('exposes the edited files once they are flushed', () => {
    const { result } = renderEdits()

    act(() => {
      result.current.handleChange('src/a.ts', 'a1')
    })
    expect(result.current.editedFiles.size).toBe(0)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect([...result.current.editedFiles]).toEqual([['src/a.ts', 'a1']])
  })

  it('forgets the edited contents with the pending edits', () => {
    const { result } = renderEdits()

    act(() => {
      result.current.handleChange('src/a.ts', 'a1')
      vi.advanceTimersByTime(300)
      result.current.discardPending()
    })

    expect(result.current.editedContentOf('src/a.ts')).toBeUndefined()
    expect(result.current.editedFiles.size).toBe(0)
  })

  it('flushes the pending edits when the page gets hidden', () => {
    const { result, onPersist } = renderEdits()

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    setVisibility('hidden')
    setVisibility('visible')

    expect(onPersist).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
  })

  it('flushes the pending edits on unmount', () => {
    const { result, unmount, onPersist, onSync } = renderEdits()

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    unmount()

    expect(onPersist).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
    expect(onSync).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
  })

  it('adds a created file to the edited files at once', () => {
    const { result, onStructureChange } = renderEdits()

    act(() => result.current.handleStructureChange({ written: [['src/new.ts', '']], removed: [] }))

    expect(result.current.filesOf(new Map([['src/a.ts', 'a']]))).toEqual(
      new Map([
        ['src/a.ts', 'a'],
        ['src/new.ts', ''],
      ])
    )
    expect(onStructureChange).toHaveBeenCalledExactlyOnceWith({ written: [['src/new.ts', '']], removed: [] })
  })

  it('flushes the pending edits before a file moves, then drops its old path', () => {
    const { result, onPersist, onSync, onStructureChange } = renderEdits()

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    act(() => result.current.handleStructureChange({ written: [['src/b.ts', 'a1']], removed: ['src/a.ts'] }))

    expect(onPersist).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
    expect(onSync).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
    expect(onPersist.mock.invocationCallOrder[0]).toBeLessThan(onStructureChange.mock.invocationCallOrder[0] ?? 0)
    expect(result.current.editedContentOf('src/a.ts')).toBeUndefined()
    expect(result.current.editedContentOf('src/b.ts')).toBe('a1')
    expect(result.current.filesOf(new Map([['src/a.ts', 'a']]))).toEqual(new Map([['src/b.ts', 'a1']]))
  })

  it('brings a removed path back when a file is written there again', () => {
    const { result } = renderEdits()

    act(() => result.current.handleStructureChange({ written: [['src/b.ts', 'a']], removed: ['src/a.ts'] }))
    act(() => result.current.handleStructureChange({ written: [['src/a.ts', '']], removed: [] }))

    expect(result.current.filesOf(new Map([['src/a.ts', 'a']]))).toEqual(
      new Map([
        ['src/a.ts', ''],
        ['src/b.ts', 'a'],
      ])
    )
  })

  it('forgets the removed paths with the pending edits', () => {
    const { result } = renderEdits()

    act(() => result.current.handleStructureChange({ written: [['src/b.ts', 'a']], removed: ['src/a.ts'] }))
    act(() => result.current.discardPending())

    expect(result.current.filesOf(new Map([['src/a.ts', 'a']]))).toEqual(new Map([['src/a.ts', 'a']]))
  })
})
