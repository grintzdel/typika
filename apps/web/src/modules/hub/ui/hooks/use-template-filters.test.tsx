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

  it('writes a toggled filter and a reset to the query string', () => {
    const { result } = renderHook(() => useTemplateFilters({ language: 'go' }, TEMPLATES))

    act(() => result.current.handleToggle('level', 'beginner'))
    act(() => result.current.handleReset())

    expect(router.navigate).toHaveBeenNthCalledWith(1, {
      to: '/templates',
      search: { language: 'go', level: 'beginner' },
    })
    expect(router.navigate).toHaveBeenNthCalledWith(2, { to: '/templates', search: {} })
  })
})
