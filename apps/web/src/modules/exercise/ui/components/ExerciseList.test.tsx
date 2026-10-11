import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ExerciseList } from './ExerciseList.tsx'

describe('ExerciseList', () => {
  it('links to each exercise and marks the solved ones', () => {
    render(
      <ExerciseList
        templateName="strategy-ts"
        exercises={[
          { name: 'add-option', title: 'Add an option', kind: 'refactor' },
          { name: 'fix-it', title: 'Fix it', kind: 'fix' },
        ]}
        solved={['fix-it']}
      />
    )

    const list = screen.getByRole('list', { name: 'Exercices' })
    expect(list.querySelectorAll('a')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Add an option/ }).getAttribute('href')).toBe(
      '/play/strategy-ts?exercise=add-option'
    )
    expect(screen.getByRole('link', { name: /Fix it/ }).textContent).toContain('Réussi')
    expect(screen.getByRole('link', { name: /Add an option/ }).textContent).not.toContain('Réussi')
  })
})
