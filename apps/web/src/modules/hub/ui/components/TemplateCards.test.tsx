import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NO_FILTERS } from '../../core/domain/template-filters.domain-model.ts'
import { TemplateCards } from './TemplateCards.tsx'

describe('TemplateCards', () => {
  it('links each template to its page with its language and level', () => {
    render(
      <TemplateCards
        templates={[
          {
            name: 'strategy-go',
            title: 'Strategy: shipping options',
            summary: 'Pick an algorithm.',
            language: 'go',
            level: 'intermediate',
            values: NO_FILTERS,
          },
        ]}
      />
    )

    const card = screen.getByRole('link', { name: /Strategy: shipping options/ })
    expect(card.getAttribute('href')).toBe('/templates/strategy-go')
    expect(card.textContent).toContain('Go')
    expect(card.textContent).toContain('Intermédiaire')
  })
})
