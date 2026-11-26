import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Problem } from '../../core/domain/problems.domain-model.ts'
import { ProblemsPanel } from './ProblemsPanel.tsx'

const PROBLEMS: ReadonlyArray<Problem> = [
  {
    path: 'src/main.ts',
    line: 4,
    column: 7,
    from: 50,
    to: 55,
    severity: 'error',
    message: "Type 'string' is not assignable to type 'number'.",
  },
  { path: 'src/money.ts', line: 2, column: 1, from: 10, to: 10, severity: 'warning', message: 'Unused value.' },
]

describe('ProblemsPanel', () => {
  it('says when the project has no problem', () => {
    render(<ProblemsPanel problems={[]} onOpen={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Problèmes' }).textContent).toContain('Aucun problème')
  })

  it('lists the problems by file with their severity and position', () => {
    render(<ProblemsPanel problems={PROBLEMS} onOpen={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'src/main.ts' })).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: "Erreur, src/main.ts, ligne 4, colonne 7 : Type 'string' is not assignable to type 'number'.",
      })
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Avertissement, src/money.ts, ligne 2, colonne 1 : Unused value.' })
    ).toBeTruthy()
  })

  it('opens the file at the problem', () => {
    const onOpen = vi.fn()
    render(<ProblemsPanel problems={PROBLEMS} onOpen={onOpen} />)

    fireEvent.click(screen.getByRole('button', { name: /Unused value/ }))

    expect(onOpen).toHaveBeenCalledWith(PROBLEMS[1])
  })
})
