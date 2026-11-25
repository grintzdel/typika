import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { baseDiffTab, fileTab, originalTab } from '../../core/domain/editor-tabs.domain-model.ts'
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

  it('keeps the last code tab for the editor while a diff is active', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleOpenTabs([fileTab('src/quote.ts')], RANGE))
    act(() => result.current.handleOpenTabs([baseDiffTab('src/quote.ts')], undefined))

    expect(result.current.activeTab).toEqual(baseDiffTab('src/quote.ts'))
    expect(result.current.editorTab).toEqual(fileTab('src/quote.ts'))
  })

  it('keeps the editor on a closed tab until another code tab opens', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleClose('src/main.ts'))
    expect(result.current.activeTab).toBeUndefined()
    expect(result.current.editorTab).toEqual(fileTab('src/main.ts'))

    act(() => result.current.handleOpenFile('src/quote.ts'))
    expect(result.current.editorTab).toEqual(fileTab('src/quote.ts'))
  })

  it('opens a file at a range to reveal, only while its tab is active', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleReveal({ path: 'src/quote.ts', from: 10, to: 15 }))
    expect(result.current.activeTab).toEqual(fileTab('src/quote.ts'))
    expect(result.current.reveal).toEqual({ from: 10, to: 15 })

    act(() => result.current.handleSelect('src/main.ts'))
    expect(result.current.reveal).toBeUndefined()
  })

  it('reveals the same range again as a new request', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleReveal({ path: 'src/main.ts', from: 1, to: 2 }))
    const first = result.current.reveal
    act(() => result.current.handleReveal({ path: 'src/main.ts', from: 1, to: 2 }))

    expect(result.current.reveal).toEqual(first)
    expect(result.current.reveal).not.toBe(first)
  })

  it('closes the active tab', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleOpenFile('src/quote.ts'))
    act(() => result.current.handleCloseActive())

    expect(result.current.tabs).toEqual([fileTab('src/main.ts')])
  })

  it('steps to the next and the previous tab', () => {
    const { result } = renderHook(() => useEditorTabs('src/main.ts'))

    act(() => result.current.handleOpenFile('src/quote.ts'))
    act(() => result.current.handleStep(1))
    expect(result.current.activeTab).toEqual(fileTab('src/main.ts'))

    act(() => result.current.handleStep(-1))
    expect(result.current.activeTab).toEqual(fileTab('src/quote.ts'))
  })
})
