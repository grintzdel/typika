import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ExercisePanel, type ExercisePanelProps } from './ExercisePanel.tsx'

const EXERCISE = {
  name: 'implement-express',
  kind: 'fix',
  title: 'Implement express',
  readme: 'Express **throws**.',
  failing: ['tests/express.test.ts'],
  hints: ['First hint.', 'Second hint.'],
} as const

const renderPanel = (overrides: Partial<ExercisePanelProps> = {}) => {
  const handlers = { onRevealHint: vi.fn(), onShowSolution: vi.fn(), onApplySolution: vi.fn() }
  render(
    <ExercisePanel
      exercise={EXERCISE}
      progress={undefined}
      isSolved={false}
      next={{ kind: 'exercise', href: '/play/strategy-ts?exercise=other' }}
      revealedHints={0}
      embeddedTemplates={[]}
      {...handlers}
      {...overrides}
    />
  )
  return handlers
}

const panel = () => screen.getByRole('region', { name: 'Exercice' })

describe('ExercisePanel', () => {
  it('shows the title, the kind, the statement and the target tests', () => {
    renderPanel()

    expect(screen.getByRole('heading', { name: 'Implement express' })).toBeTruthy()
    expect(screen.getByText('fix')).toBeTruthy()
    expect(panel().querySelector('strong')?.textContent).toBe('throws')
    expect(screen.getByRole('list', { name: 'Tests cibles' }).textContent).toBe('tests/express.test.ts')
  })

  it('asks to run the tests before any progress', () => {
    renderPanel()

    expect(screen.getByText('Lancez les tests pour voir votre progression.')).toBeTruthy()
  })

  it('shows the progress of the target tests', () => {
    renderPanel({ progress: { passed: 3, total: 5 } })

    expect(screen.getByText('3 / 5 tests cibles verts')).toBeTruthy()
  })

  it('congratulates and links to the next exercise once solved', () => {
    renderPanel({ isSolved: true })

    expect(screen.getByText('Exercice réussi !')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Exercice suivant' }).getAttribute('href')).toBe(
      '/play/strategy-ts?exercise=other'
    )
  })

  it('links back to the template when no exercise is left', () => {
    renderPanel({ isSolved: true, next: { kind: 'template', href: '/play/strategy-ts' } })

    expect(screen.getByRole('link', { name: 'Retour au template' }).getAttribute('href')).toBe('/play/strategy-ts')
  })

  it('reveals the next hint and shows the revealed ones', () => {
    const { onRevealHint } = renderPanel({ revealedHints: 1 })

    expect(screen.getByText('First hint.')).toBeTruthy()
    expect(screen.queryByText('Second hint.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Afficher un indice (2 / 2)' }))

    expect(onRevealHint).toHaveBeenCalled()
  })

  it('offers no more hints once they are all revealed', () => {
    renderPanel({ revealedHints: 2 })

    expect(screen.queryByRole('button', { name: /Afficher un indice/ })).toBeNull()
  })
})
