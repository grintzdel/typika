import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TourStepBody } from './TourStepBody.tsx'

const renderBody = (isChanged: boolean) => {
  const onOpenOriginal = vi.fn()
  const { container } = render(
    <TourStepBody
      body="The context **delegates**."
      isChanged={isChanged}
      embeddedTemplates={[]}
      onOpenOriginal={onOpenOriginal}
    />
  )
  return { container, onOpenOriginal }
}

describe('TourStepBody', () => {
  it('renders the Markdown of the step', () => {
    const { container } = renderBody(false)

    expect(container.querySelector('strong')?.textContent).toBe('delegates')
  })

  it('tells when the code has changed and opens the original', () => {
    const { onOpenOriginal } = renderBody(true)

    expect(screen.getByText('Le code a changé depuis cette visite.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir la version d’origine' }))

    expect(onOpenOriginal).toHaveBeenCalled()
  })

  it('says nothing about changes while the code matches', () => {
    renderBody(false)

    expect(screen.queryByText('Le code a changé depuis cette visite.')).toBeNull()
  })
})
