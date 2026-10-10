import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEditFiles } from './use-edit-files.ts'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useEditFiles', () => {
  it('flushes the last content of each file after a pause', () => {
    const onFlush = vi.fn()
    const { result } = renderHook(() => useEditFiles(onFlush))

    act(() => {
      result.current.handleChange('src/a.ts', 'a1')
      result.current.handleChange('src/a.ts', 'a2')
      result.current.handleChange('src/b.ts', 'b1')
    })
    expect(onFlush).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onFlush).toHaveBeenCalledExactlyOnceWith([
      ['src/a.ts', 'a2'],
      ['src/b.ts', 'b1'],
    ])
  })

  it('hands over the pending edits on demand, without flushing them again', () => {
    const onFlush = vi.fn()
    const { result } = renderHook(() => useEditFiles(onFlush))

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    const pending = result.current.takePending()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(pending).toEqual([['src/a.ts', 'a1']])
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('flushes the pending edits on unmount', () => {
    const onFlush = vi.fn()
    const { result, unmount } = renderHook(() => useEditFiles(onFlush))

    act(() => result.current.handleChange('src/a.ts', 'a1'))
    unmount()

    expect(onFlush).toHaveBeenCalledExactlyOnceWith([['src/a.ts', 'a1']])
  })
})
