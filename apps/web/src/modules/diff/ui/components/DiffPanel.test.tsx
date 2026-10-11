import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { FileChange } from '../../core/domain/file-changes.domain-model.ts'
import { DiffPanel, type DiffPanelProps } from './DiffPanel.tsx'

const CHANGES: ReadonlyArray<FileChange> = [
  { path: 'src/a.ts', status: 'added', before: '', after: 'a' },
  { path: 'src/b.ts', status: 'modified', before: 'b', after: 'b2' },
  { path: 'src/c.ts', status: 'deleted', before: 'c', after: '' },
]

const renderPanel = (overrides: Partial<DiffPanelProps> = {}) => {
  const onSourceChange = vi.fn()
  const onOpen = vi.fn()
  render(
    <DiffPanel
      source="base"
      baseName="sample-base-ts"
      changes={CHANGES}
      isLoading={false}
      onSourceChange={onSourceChange}
      onOpen={onOpen}
      {...overrides}
    />
  )
  return { onSourceChange, onOpen }
}

describe('DiffPanel', () => {
  it('lists the changed files with their status', () => {
    renderPanel()

    const files = screen.getByRole('list', { name: 'Fichiers modifiés' })
    expect(files.querySelectorAll('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'src/a.ts, ajouté' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'src/b.ts, modifié' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'src/c.ts, supprimé' })).toBeTruthy()
  })

  it('opens a file', () => {
    const { onOpen } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'src/b.ts, modifié' }))

    expect(onOpen).toHaveBeenCalledWith('src/b.ts')
  })

  it('switches between the base and my changes', () => {
    const { onSourceChange } = renderPanel()

    expect(screen.getByRole('button', { name: 'Depuis la base' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Mes modifications' }))

    expect(onSourceChange).toHaveBeenCalledWith('mine')
  })

  it('links to the base in a new tab', () => {
    renderPanel()

    const link = screen.getByRole('link', { name: 'Ouvrir la base' })
    expect(link.getAttribute('href')).toBe('/play/sample-base-ts')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('offers only my changes without a base', () => {
    renderPanel({ source: 'mine', baseName: undefined })

    expect(screen.getByRole('button', { name: 'Depuis la base' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('link', { name: 'Ouvrir la base' })).toBeNull()
  })

  it('says when nothing has changed', () => {
    renderPanel({ changes: [] })

    expect(screen.getByText('Aucune modification.')).toBeTruthy()
  })
})
