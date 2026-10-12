import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ListedTemplate } from '../../core/domain/hub.domain-model.ts'
import { NO_FILTERS } from '../../core/domain/template-filters.domain-model.ts'
import { TemplateCards } from './TemplateCards.tsx'

const listed = (overrides: Partial<ListedTemplate> = {}): ListedTemplate => ({
  name: 'strategy-go',
  title: 'Strategy: shipping options',
  summary: 'Pick an algorithm.',
  language: 'go',
  level: 'intermediate',
  updatedAt: '2026-10-08',
  health: undefined,
  searchText: 'strategy-go',
  values: NO_FILTERS,
  ...overrides,
})

describe('TemplateCards', () => {
  it('links each template to its page with its language and level', () => {
    render(<TemplateCards templates={[listed()]} />)

    const card = screen.getByRole('link', { name: /Strategy: shipping options/ })
    expect(card.getAttribute('href')).toBe('/templates/strategy-go')
    expect(card.textContent).toContain('Go')
    expect(card.textContent).toContain('Intermédiaire')
    expect(screen.queryByText('Sain')).toBeNull()
  })

  it('shows the health of a template that is not healthy, in words', () => {
    render(
      <TemplateCards
        templates={[
          listed({ name: 'a', health: 'degraded' }),
          listed({ name: 'b', health: 'broken' }),
          listed({ name: 'c', health: 'healthy' }),
        ]}
      />
    )

    expect(screen.getByText('Dégradé')).toBeDefined()
    expect(screen.getByText('Cassé')).toBeDefined()
    expect(screen.queryByText('Sain')).toBeNull()
  })
})
