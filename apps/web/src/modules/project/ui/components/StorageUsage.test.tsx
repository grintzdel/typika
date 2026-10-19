import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StorageUsage } from './StorageUsage.tsx'

describe('StorageUsage', () => {
  it('shows the space used out of the quota', () => {
    render(<StorageUsage usage={{ usage: 1_500_000, quota: 2_000_000_000, isNearlyFull: false }} />)

    expect(screen.getByText(/Espace utilisé/).textContent).toMatch(/1,5\sMo.*2\sGo/)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('warns when the storage is nearly full', () => {
    render(<StorageUsage usage={{ usage: 1_700_000_000, quota: 2_000_000_000, isNearlyFull: true }} />)

    expect(screen.getByRole('alert').textContent).toContain('presque plein')
  })

  it('shows nothing without an estimate', () => {
    const { container } = render(<StorageUsage usage={undefined} />)

    expect(container.childElementCount).toBe(0)
  })
})
