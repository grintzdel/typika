import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DiffEditor, DiffLayout } from './DiffEditor.tsx'

const lines = (count: number) => Array.from({ length: count }, (_, index) => `const line${index} = ${index}`)

const before = lines(20).join('\n')
const after = [...lines(19), 'const line19 = 0'].join('\n')

describe('DiffEditor', () => {
  it('counts the collapsed unchanged lines in the chosen language', () => {
    render(
      <DiffEditor
        path="src/main.ts"
        before={before}
        after={after}
        layout={DiffLayout.UNIFIED}
        labels={{ before: 'Avant', after: 'Après' }}
        unifiedLabel="Diff"
      />
    )

    expect(screen.getByText('16 lignes inchangées')).toBeTruthy()
  })
})
