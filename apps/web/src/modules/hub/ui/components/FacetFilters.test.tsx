import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NO_FILTERS } from '../../core/domain/template-filters.domain-model.ts'
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

describe('FacetFilters', () => {
  it('checks the selected values and reports a toggle', () => {
    const onToggle = vi.fn()
    render(
      <FacetFilters
        options={OPTIONS}
        filters={{ ...NO_FILTERS, topic: ['design-pattern/behavioral'], language: ['go'] }}
        onToggle={onToggle}
      />
    )

    const topics = screen.getByRole('group', { name: 'Sujet' })
    expect(within(topics).getByRole('checkbox', { name: 'Design patterns' })).toHaveProperty('checked', false)
    expect(within(topics).getByRole('checkbox', { name: 'Comportement' })).toHaveProperty('checked', true)
    expect(within(screen.getByRole('group', { name: 'Langage' })).getByRole('checkbox', { name: 'Go' })).toHaveProperty(
      'checked',
      true
    )
    fireEvent.click(within(screen.getByRole('group', { name: 'Niveau' })).getByRole('checkbox', { name: 'Débutant' }))
    expect(onToggle).toHaveBeenCalledWith('level', 'beginner')
  })
})
