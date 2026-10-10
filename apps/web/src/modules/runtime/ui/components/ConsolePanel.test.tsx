import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EMPTY_CONSOLE, type ConsoleState } from '../../core/domain/console.domain-model.ts'
import { ConsolePanel } from './ConsolePanel.tsx'

const withOutput = (overrides: Partial<ConsoleState>): ConsoleState => ({ ...EMPTY_CONSOLE, ...overrides })

describe('ConsolePanel', () => {
  it('invites to run the program before the first run', () => {
    render(<ConsolePanel console={undefined} />)

    expect(screen.getByRole('region', { name: 'Console' }).textContent).toContain('Lancez « Exécuter »')
  })

  it('shows the output and the exit code', () => {
    render(
      <ConsolePanel
        console={withOutput({
          entries: [
            { stream: 'stdout', text: 'Ada (regular)\n' },
            { stream: 'stderr', text: 'warning\n' },
          ],
          outcome: { _tag: 'Exited', code: 0 },
        })}
      />
    )

    expect(screen.getByText(/Ada \(regular\)/)).toBeTruthy()
    expect(screen.getByText(/warning/)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Terminé avec le code 0')
  })

  it('announces a running program', () => {
    render(<ConsolePanel console={EMPTY_CONSOLE} />)

    expect(screen.getByRole('status').textContent).toBe('En cours…')
  })

  it('shows a timeout in seconds', () => {
    render(<ConsolePanel console={withOutput({ outcome: { _tag: 'TimedOut', limitMs: 30_000 } })} />)

    expect(screen.getByRole('status').textContent).toBe('Interrompu après 30 s')
  })

  it('lists build diagnostics', () => {
    render(
      <ConsolePanel
        console={withOutput({
          entries: [{ stream: 'diagnostic', text: 'src/main.ts:3:7 Expected ";"' }],
          outcome: { _tag: 'CompileFailed' },
        })}
      />
    )

    expect(screen.getByText('src/main.ts:3:7 Expected ";"')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Échec du build')
  })

  it('says when the beginning of the output was dropped', () => {
    render(<ConsolePanel console={withOutput({ truncated: true })} />)

    expect(screen.getByText('Le début de la sortie a été supprimé')).toBeTruthy()
  })
})
