import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { templatePage } from '../../__tests__/hub-index.factory.ts'
import { TemplateOverview } from './TemplateOverview.tsx'

describe('TemplateOverview', () => {
  it('shows the trail, the title and a link to the sandbox', () => {
    render(<TemplateOverview page={templatePage()} />)

    const trail = screen.getByRole('navigation', { name: "Fil d'Ariane" })
    expect(within(trail).getByRole('link', { name: 'Comportement' }).getAttribute('href')).toBe(
      '/templates?topic=design-pattern%2Fbehavioral'
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Strategy: shipping options')
    expect(screen.getByRole('link', { name: 'Ouvrir dans la sandbox' }).getAttribute('href')).toBe('/play/strategy-ts')
  })

  it('links every language, the current one marked', () => {
    render(<TemplateOverview page={templatePage()} />)

    const languages = screen.getByRole('navigation', { name: 'Langage' })
    expect(within(languages).getByRole('link', { name: 'TypeScript' }).getAttribute('aria-current')).toBe('page')
    expect(within(languages).getByRole('link', { name: 'Go' }).getAttribute('href')).toBe('/templates/strategy-go')
  })
})
