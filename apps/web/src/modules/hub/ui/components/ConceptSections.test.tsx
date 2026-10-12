import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConceptSections } from './ConceptSections.tsx'

describe('ConceptSections', () => {
  it('shows a section per category with a card per concept', () => {
    render(
      <ConceptSections
        sections={[
          {
            category: 'design-pattern',
            families: ['behavioral'],
            concepts: [
              {
                name: 'strategy-ts',
                label: 'Strategy',
                summary: 'Pick an algorithm.',
                languages: [
                  { language: 'typescript', name: 'strategy-ts' },
                  { language: 'go', name: 'strategy-go' },
                ],
              },
            ],
          },
        ]}
      />
    )

    const section = screen.getByRole('region', { name: 'Design patterns' })
    const card = within(section).getByRole('link', { name: /^Strategy/ })
    expect(card.getAttribute('href')).toBe('/templates/strategy-ts')
    expect(card.textContent).toContain('TypeScript')
    expect(card.textContent).toContain('Go')
    expect(within(section).getByRole('link', { name: 'Comportement' }).getAttribute('href')).toBe(
      '/templates?topic=design-pattern%2Fbehavioral'
    )
    expect(within(section).getByRole('link', { name: 'Tout voir' }).getAttribute('href')).toBe(
      '/templates?topic=design-pattern'
    )
  })
})
