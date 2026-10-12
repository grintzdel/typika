import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hubIndex } from '../../__tests__/hub-index.factory.ts'
import { listedTemplatesOf } from '../../core/domain/hub.domain-model.ts'
import { useTemplateFilters } from './use-template-filters.ts'

const router = vi.hoisted(() => ({ isHydrated: true, navigate: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useHydrated: () => router.isHydrated,
  useNavigate: () => router.navigate,
}))

const TEMPLATES = listedTemplatesOf(hubIndex())

describe('useTemplateFilters', () => {
  beforeEach(() => {
    router.isHydrated = true
    router.navigate.mockClear()
  })

  it('keeps the templates matching the filters of the query string', () => {
    const { result } = renderHook(() => useTemplateFilters({ language: 'go' }, TEMPLATES))

    expect(result.current.results.map((template) => template.name)).toEqual(['strategy-go'])
    expect(result.current.active).toEqual([{ facet: 'language', value: 'go' }])
  })

  it('shows every template until the page is hydrated, like the prerendered page', () => {
    router.isHydrated = false
    const { result } = renderHook(() => useTemplateFilters({ language: 'go' }, TEMPLATES))

    expect(result.current.results).toHaveLength(4)
  })

  it('searches the templates and counts each facet value against the search', () => {
    const { result } = renderHook(() => useTemplateFilters({ q: 'switch' }, TEMPLATES))

    expect(result.current.text).toBe('switch')
    expect(result.current.sort).toBe('relevance')
    expect(result.current.results.map((template) => template.name)).toEqual(['strategy-go', 'strategy-ts'])
    expect(result.current.counts.language).toEqual({ typescript: 1, go: 1 })
  })

  it('replaces the query string while typing, and pushes a sort and a cleared search', () => {
    const { result } = renderHook(() => useTemplateFilters({ q: 'sw', language: 'go' }, TEMPLATES))

    act(() => result.current.handleSearch('swi'))
    act(() => result.current.handleSort('updated'))
    act(() => result.current.handleClearSearch())

    expect(router.navigate).toHaveBeenNthCalledWith(1, {
      to: '/templates',
      search: { language: 'go', q: 'swi' },
      replace: true,
    })
    expect(router.navigate).toHaveBeenNthCalledWith(2, {
      to: '/templates',
      search: { language: 'go', q: 'sw', sort: 'updated' },
      replace: false,
    })
    expect(router.navigate).toHaveBeenNthCalledWith(3, { to: '/templates', search: { language: 'go' }, replace: false })
  })

  it('writes a toggled filter and a reset to the query string', () => {
    const { result } = renderHook(() => useTemplateFilters({ language: 'go' }, TEMPLATES))

    act(() => result.current.handleToggle('level', 'beginner'))
    act(() => result.current.handleReset())

    expect(router.navigate).toHaveBeenNthCalledWith(1, {
      to: '/templates',
      search: { language: 'go', level: 'beginner' },
      replace: false,
    })
    expect(router.navigate).toHaveBeenNthCalledWith(2, { to: '/templates', search: {}, replace: false })
  })
})
