import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fileTab, originalTab } from '../../core/domain/editor-tabs.domain-model.ts'
import { useEditorTabs } from './use-editor-tabs.ts'

const RANGE = { from: 2, to: 4 }

describe('useEditorTabs', () => {
  it('opens the initial file once it is known', () => {
    const { result, rerender } = renderHook(({ path }) => useEditorTabs(path), {
      initialProps: { path: undefined as string | undefined },
    })
    expect(result.current.tabs).toEqual([])

    rerender({ path: 'src/main.ts' })

    expect(result.current.tabs).toEqual([fileTab('src/main.ts')])
    expect(result.current.activeTab).toEqual(fileTab('src/main.ts'))
  })

  it('highlights a range only while its tab is active', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleOpenTabs([fileTab('src/quote.ts'), fileTab('tests/quote.test.ts')], RANGE))
    expect(result.current.activeTab).toEqual(fileTab('src/quote.ts'))
    expect(result.current.highlight).toBe(RANGE)

    act(() => result.current.handleOpenFile('src/main.ts'))
    expect(result.current.highlight).toBeUndefined()

    act(() => result.current.handleSelect('src/quote.ts'))
    expect(result.current.highlight).toBe(RANGE)
  })

  it('drops the highlight when tabs open without one', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleOpenTabs([fileTab('src/quote.ts')], RANGE))
    act(() => result.current.handleOpenTabs([originalTab('src/quote.ts')], undefined))
    act(() => result.current.handleSelect('src/quote.ts'))

    expect(result.current.highlight).toBeUndefined()
  })

  it('closes a tab', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleOpenFile('src/quote.ts'))
    act(() => result.current.handleClose('src/quote.ts'))

    expect(result.current.tabs).toEqual([fileTab('src/main.ts')])
    expect(result.current.activeTab).toEqual(fileTab('src/main.ts'))
  })
})
