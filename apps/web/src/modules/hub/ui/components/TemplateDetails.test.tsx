import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { templatePage } from '../../__tests__/hub-index.factory.ts'
import { TemplateDetails } from './TemplateDetails.tsx'

describe('TemplateDetails', () => {
  it('lists the tour, the base with its diff and the exercises', () => {
    render(<TemplateDetails page={templatePage()} />)

    expect(
      within(screen.getByRole('region', { name: 'Ce que vous allez voir' })).getAllByRole('listitem')
    ).toHaveLength(2)
    const base = screen.getByRole('region', { name: 'Avant / après' })
    expect(base.textContent).toContain('strategy-base-ts')
    expect(within(base).getByRole('link', { name: 'Voir le diff' }).getAttribute('href')).toBe(
      '/play/strategy-ts?panel=diff'
    )
    const exercise = within(screen.getByRole('region', { name: 'Exercices' })).getByRole('link', {
      name: /Implement express/,
    })
    expect(exercise.getAttribute('href')).toBe('/play/strategy-ts?exercise=implement-express')
    expect(exercise.textContent).toContain('refactoring')
  })

  it('names the variants, the topics and the provenance', () => {
    render(<TemplateDetails page={templatePage()} />)

    expect(within(screen.getByRole('region', { name: 'Variantes' })).getByRole('link', { name: 'Go' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Sujets' }).textContent).toContain('Strategy')
    const about = screen.getByRole('region', { name: 'À propos' })
    expect(about.textContent).toContain('MIT-0')
    expect(within(about).getByText('12 octobre 2026').getAttribute('datetime')).toBe('2026-10-12')
  })

  it('gives the embed its own section', () => {
    render(<TemplateDetails page={templatePage()} embed={<button type="button">Copier</button>} />)

    expect(within(screen.getByRole('region', { name: 'Embed' })).getByRole('button', { name: 'Copier' })).toBeDefined()
  })

  it('leaves out the base when the template has none', () => {
    render(<TemplateDetails page={templatePage({ base: undefined, languages: [] })} />)

    expect(screen.queryByRole('region', { name: 'Avant / après' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Variantes' })).toBeNull()
  })
})
