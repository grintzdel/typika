import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import { i18n } from '../../../../i18n/i18n.ts'
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

  it('links a comparison with each other variant', () => {
    render(<TemplateOverview page={templatePage()} />)

    expect(screen.getByRole('link', { name: 'Comparer avec Go' }).getAttribute('href')).toBe(
      '/compare/strategy-ts?a=typescript&b=go'
    )
  })

  it('offers no comparison without another variant', () => {
    render(<TemplateOverview page={templatePage({ comparisons: [] })} />)

    expect(screen.queryByRole('link', { name: /Comparer/ })).toBeNull()
  })

  it('shows a degraded health in words', () => {
    render(<TemplateOverview page={templatePage({ health: { status: 'degraded', runUrl: null } })} />)

    expect(screen.getByText('Dégradé')).toBeDefined()
  })

  it('says the content is in English when the interface is not', () => {
    render(<TemplateOverview page={templatePage()} />)

    expect(screen.getByText('Le contenu des templates est en anglais.')).toBeDefined()
    expect(screen.getByRole('heading', { level: 1 }).getAttribute('lang')).toBe('en')
  })

  it('says nothing about the content language in English', () => {
    render(
      <I18nextProvider i18n={i18n.cloneInstance({ lng: 'en' })}>
        <TemplateOverview page={templatePage()} />
      </I18nextProvider>
    )

    expect(screen.queryByText('Template content is in English.')).toBeNull()
  })
})
