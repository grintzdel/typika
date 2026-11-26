import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LanguageServiceStatus } from './LanguageServiceStatus.tsx'

const status = () => screen.getByRole('status', { name: 'TypeScript' })

describe('LanguageServiceStatus', () => {
  it('tells that TypeScript is starting', () => {
    render(<LanguageServiceStatus status="starting" onReload={() => {}} />)

    expect(status().textContent).toBe('TypeScript démarre…')
  })

  it('says nothing once TypeScript is ready', () => {
    render(<LanguageServiceStatus status="ready" onReload={() => {}} />)

    expect(status().textContent).toBe('')
  })

  it('warns that TypeScript could not start', () => {
    render(<LanguageServiceStatus status="unavailable" onReload={() => {}} />)

    expect(status().textContent).toBe('TypeScript indisponible')
  })

  it('offers to reload when a newer version of Typika replaced this one', () => {
    const onReload = vi.fn()
    render(<LanguageServiceStatus status="outdated" onReload={onReload} />)

    expect(status().textContent).toBe('Nouvelle version de Typika')
    fireEvent.click(screen.getByRole('button', { name: 'Recharger' }))

    expect(onReload).toHaveBeenCalledOnce()
  })

  it('offers no reload otherwise', () => {
    render(<LanguageServiceStatus status="unavailable" onReload={() => {}} />)

    expect(screen.queryByRole('button', { name: 'Recharger' })).toBeNull()
  })
})
