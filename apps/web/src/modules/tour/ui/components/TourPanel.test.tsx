import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TourPanel, type TourPanelProps } from './TourPanel.tsx'

const STEPS = [
  { id: 'overview', title: 'Overview' },
  { id: 'context', title: 'The context' },
  { id: 'trade-offs', title: 'Trade-offs' },
]

const renderPanel = (overrides: Partial<TourPanelProps> = {}) => {
  const onSelect = vi.fn()
  const onOpenOriginal = vi.fn()
  render(
    <TourPanel
      steps={STEPS}
      index={1}
      body="The context **delegates**."
      isChanged={false}
      announcement=""
      embeddedTemplates={[]}
      onSelect={onSelect}
      onOpenOriginal={onOpenOriginal}
      {...overrides}
    />
  )
  return { onSelect, onOpenOriginal }
}

const tour = () => screen.getByRole('region', { name: 'Visite guidée' })

describe('TourPanel', () => {
  it('shows the progress, the title and the body of the step', () => {
    renderPanel()

    expect(tour().textContent).toContain('Étape 2 / 3')
    expect(screen.getByRole('heading', { name: 'The context' })).toBeTruthy()
    expect(tour().querySelector('strong')?.textContent).toBe('delegates')
  })

  it('goes to the previous and the next step', () => {
    const { onSelect } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Étape précédente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Étape suivante' }))

    expect(onSelect.mock.calls).toEqual([[0], [2]])
  })

  it('disables the buttons at both ends of the tour', () => {
    renderPanel({ index: 0 })
    expect(screen.getByRole('button', { name: 'Étape précédente' }).hasAttribute('disabled')).toBe(true)
  })

  it('disables the next button on the last step', () => {
    renderPanel({ index: 2 })
    expect(screen.getByRole('button', { name: 'Étape suivante' }).hasAttribute('disabled')).toBe(true)
  })

  it('lists the steps, marks the current one and opens one on click', () => {
    const { onSelect } = renderPanel()
    const list = screen.getByRole('list', { name: 'Étapes' })

    expect(list.querySelector('[aria-current="step"]')?.textContent).toBe('The context')
    fireEvent.click(screen.getByRole('button', { name: 'Trade-offs' }))

    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('announces the step it is given', () => {
    renderPanel({ announcement: 'Étape 2 sur 3 : The context' })

    expect(screen.getByText('Étape 2 sur 3 : The context').getAttribute('aria-live')).toBe('polite')
  })

  it('tells when the code has changed and opens the original', () => {
    const { onOpenOriginal } = renderPanel({ isChanged: true })

    expect(screen.getByText('Le code a changé depuis cette visite.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir la version d’origine' }))

    expect(onOpenOriginal).toHaveBeenCalled()
  })

  it('says nothing about changes while the code matches', () => {
    renderPanel()

    expect(screen.queryByText('Le code a changé depuis cette visite.')).toBeNull()
  })
})
