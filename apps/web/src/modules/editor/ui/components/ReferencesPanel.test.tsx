import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ReferenceSearch } from '../../core/domain/language-service.domain-model.ts'
import { ReferencesPanel } from './ReferencesPanel.tsx'

const SEARCH: ReferenceSearch = {
  symbol: 'money',
  references: [
    {
      path: 'src/main.ts',
      from: 9,
      to: 14,
      line: 1,
      lineText: "import { money } from './money.ts'",
      isDefinition: false,
    },
    {
      path: 'src/money.ts',
      from: 13,
      to: 18,
      line: 4,
      lineText: 'export const money = (cents: number)',
      isDefinition: true,
    },
    { path: 'src/money.ts', from: 90, to: 95, line: 6, lineText: 'money(a.cents + b.cents)', isDefinition: false },
  ],
}

describe('ReferencesPanel', () => {
  it('explains how to search before any search', () => {
    render(<ReferencesPanel search={undefined} onOpen={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Références' }).textContent).toContain('Maj+F12')
  })

  it('counts the references and groups them by file', () => {
    render(<ReferencesPanel search={SEARCH} onOpen={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '3 références à money' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'src/main.ts',
      'src/money.ts',
    ])
  })

  it('marks the declaration', () => {
    render(<ReferencesPanel search={SEARCH} onOpen={vi.fn()} />)

    expect(screen.getByRole('button', { name: /src\/money\.ts, ligne 4/ }).textContent).toContain('déclaration')
  })

  it('opens a reference on click', () => {
    const onOpen = vi.fn()
    render(<ReferencesPanel search={SEARCH} onOpen={onOpen} />)

    fireEvent.click(screen.getByRole('button', { name: /src\/money\.ts, ligne 6/ }))

    expect(onOpen).toHaveBeenCalledWith(SEARCH.references[2])
  })

  it('says when a symbol has no reference', () => {
    render(<ReferencesPanel search={{ symbol: 'unused', references: [] }} onOpen={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '0 référence à unused' })).toBeTruthy()
  })
})
