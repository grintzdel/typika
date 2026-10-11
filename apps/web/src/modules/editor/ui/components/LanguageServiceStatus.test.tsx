import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LanguageServiceStatus } from './LanguageServiceStatus.tsx'

const status = () => screen.getByRole('status', { name: 'TypeScript' })

describe('LanguageServiceStatus', () => {
  it('tells that TypeScript is starting', () => {
    render(<LanguageServiceStatus status="starting" />)

    expect(status().textContent).toBe('TypeScript démarre…')
  })

  it('says nothing once TypeScript is ready', () => {
    render(<LanguageServiceStatus status="ready" />)

    expect(status().textContent).toBe('')
  })

  it('warns that TypeScript could not start', () => {
    render(<LanguageServiceStatus status="unavailable" />)

    expect(status().textContent).toBe('TypeScript indisponible')
  })
})
