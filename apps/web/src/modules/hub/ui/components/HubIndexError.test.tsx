import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HubIndexError } from './HubIndexError.tsx'

describe('HubIndexError', () => {
  it('names the cause and lets the user retry', () => {
    const onRetry = vi.fn()
    render(<HubIndexError failure="network" onRetry={onRetry} />)

    expect(screen.getByRole('alert').textContent).toContain('n’a pas pu être téléchargé')
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('offers no retry for an index Typika cannot read', () => {
    render(<HubIndexError failure="unsupported" onRetry={vi.fn()} />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})
