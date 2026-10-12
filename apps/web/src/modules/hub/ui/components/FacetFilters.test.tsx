import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NO_FILTERS } from '../../core/domain/template-filters.domain-model.ts'
import type { FacetCounts } from '../../core/domain/template-query.domain-model.ts'
import { FacetFilters } from './FacetFilters.tsx'

const OPTIONS = {
  topics: [
    {
      topic: 'design-pattern',
      category: 'design-pattern',
      families: [{ topic: 'design-pattern/behavioral', family: 'behavioral' }],
    },
  ],
  values: [
    { facet: 'language' as const, values: ['typescript', 'go'] },
    { facet: 'level' as const, values: ['beginner'] },
  ],
}

const COUNTS: FacetCounts = {
  topic: { 'design-pattern': 3, 'design-pattern/behavioral': 2 },
  language: { typescript: 0, go: 1 },
  paradigm: {},
  level: { beginner: 0 },
  framework: {},
  library: {},
  useCase: {},
  category: {},
}

describe('FacetFilters', () => {
  it('checks the selected values and reports a toggle', () => {
    const onToggle = vi.fn()
    render(
      <FacetFilters
        options={OPTIONS}
        filters={{ ...NO_FILTERS, topic: ['design-pattern/behavioral'], language: ['go'] }}
        counts={COUNTS}
        onToggle={onToggle}
      />
    )

    const topics = screen.getByRole('group', { name: 'Sujet' })
    expect(within(topics).getByRole('checkbox', { name: 'Design patterns 3' })).toHaveProperty('checked', false)
    expect(within(topics).getByRole('checkbox', { name: 'Comportement 2' })).toHaveProperty('checked', true)
    const languages = screen.getByRole('group', { name: 'Langage' })
    expect(within(languages).getByRole('checkbox', { name: 'Go 1' })).toHaveProperty('checked', true)
    fireEvent.click(within(languages).getByRole('checkbox', { name: 'TypeScript 0' }))
    expect(onToggle).toHaveBeenCalledWith('language', 'typescript')
  })

  it('disables a value that would leave no result, unless it is checked', () => {
    render(
      <FacetFilters
        options={OPTIONS}
        filters={{ ...NO_FILTERS, language: ['typescript'] }}
        counts={COUNTS}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByRole('checkbox', { name: 'Débutant 0' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('checkbox', { name: 'TypeScript 0' })).toHaveProperty('disabled', false)
  })
})
