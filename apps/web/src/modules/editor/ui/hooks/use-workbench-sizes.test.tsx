import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_PANEL_SIZES } from '../../../../ui/WorkbenchLayout.tsx'
import { useWorkbenchSizes } from './use-workbench-sizes.ts'

const KEY = 'typika:workbench-sizes'

afterEach(() => {
  localStorage.clear()
})

describe('useWorkbenchSizes', () => {
  it('starts from the default sizes', () => {
    const { result } = renderHook(() => useWorkbenchSizes())

    expect(result.current.sizes).toEqual(DEFAULT_PANEL_SIZES)
  })

  it('restores the sizes of the last visit', () => {
    localStorage.setItem(KEY, JSON.stringify({ sidebar: 300, aside: 500, bottom: 250 }))

    const { result } = renderHook(() => useWorkbenchSizes())

    expect(result.current.sizes).toEqual({ sidebar: 300, aside: 500, bottom: 250 })
  })

  it('ignores sizes it cannot read', () => {
    localStorage.setItem(KEY, '{"sidebar":"wide"}')

    const { result } = renderHook(() => useWorkbenchSizes())

    expect(result.current.sizes).toEqual(DEFAULT_PANEL_SIZES)
  })

  it('remembers a resized panel', () => {
    const { result } = renderHook(() => useWorkbenchSizes())

    act(() => result.current.handleResize('sidebar', 320))

    expect(result.current.sizes.sidebar).toBe(320)
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ ...DEFAULT_PANEL_SIZES, sidebar: 320 })
  })
})
