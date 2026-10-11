import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectStatus } from './ProjectStatus.tsx'

const status = () => screen.getByRole('status', { name: 'État du projet' })

describe('ProjectStatus', () => {
  it('shows the title and nothing else for an untouched project', () => {
    render(<ProjectStatus title="Strategy" isModified={false} saveFailed={false} />)

    expect(screen.getByRole('heading', { name: 'Strategy' })).toBeTruthy()
    expect(status().textContent).toBe('')
  })

  it('tells that the project differs from its template', () => {
    render(<ProjectStatus title="Strategy" isModified saveFailed={false} />)

    expect(status().textContent).toBe('Modifié')
  })

  it('warns when the edits could not be saved', () => {
    render(<ProjectStatus title="Strategy" isModified saveFailed />)

    expect(status().textContent).toBe('Modifications non enregistrées')
  })
})
