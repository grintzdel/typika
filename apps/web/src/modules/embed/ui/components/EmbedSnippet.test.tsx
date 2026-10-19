import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EmbedSnippet } from './EmbedSnippet.tsx'

describe('EmbedSnippet', () => {
  it('shows the embed path and copies the snippet', () => {
    const onCopy = vi.fn()
    render(<EmbedSnippet name="strategy-ts" isCopied={false} onCopy={onCopy} />)

    fireEvent.click(screen.getByRole('button', { name: /Copier le snippet d’embed/ }))

    expect(screen.getByText('/embed/strategy-ts')).toBeDefined()
    expect(onCopy).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('confirms the copy', () => {
    render(<EmbedSnippet name="strategy-ts" isCopied onCopy={vi.fn()} />)

    expect(screen.getByRole('status').textContent).toBe('Snippet copié')
  })
})
