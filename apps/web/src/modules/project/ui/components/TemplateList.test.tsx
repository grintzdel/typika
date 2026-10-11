import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TemplateList } from './TemplateList.tsx'

describe('TemplateList', () => {
  it('links to each template with its summary, language and level', () => {
    render(
      <TemplateList
        templates={[
          {
            name: 'observer-ts',
            title: 'Observer: reacting to an order',
            summary: 'Announce that something happened.',
            language: 'typescript',
            level: 'intermediate',
          },
          {
            name: 'strategy-go',
            title: 'Strategy: shipping options',
            summary: 'Pick an algorithm at runtime.',
            language: 'go',
            level: 'beginner',
          },
        ]}
      />
    )

    const observer = screen.getByRole('link', { name: /Observer: reacting to an order/ })
    expect(observer.getAttribute('href')).toBe('/play/observer-ts')
    expect(observer.textContent).toContain('Announce that something happened.')
    expect(observer.textContent).toContain('TypeScript')
    expect(observer.textContent).toContain('Intermédiaire')
    expect(screen.getByRole('link', { name: /Strategy: shipping options/ }).textContent).toContain('Go')
    expect(screen.getByRole('list', { name: 'Templates' }).querySelectorAll('a')).toHaveLength(2)
  })
})
