import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RecentProjects } from './RecentProjects.tsx'

const NOW = Date.UTC(2026, 9, 12, 12)

describe('RecentProjects', () => {
  it('links each project with the time of its last change', () => {
    render(
      <RecentProjects
        now={NOW}
        projects={[
          { name: 'strategy-ts', exercise: undefined, path: '/play/strategy-ts', updatedAt: NOW - 2 * 3_600_000 },
          {
            name: 'observer-ts',
            exercise: 'fix-it',
            path: '/play/observer-ts?exercise=fix-it',
            updatedAt: NOW - 30_000,
          },
        ]}
      />
    )

    const resume = screen.getByRole('region', { name: 'Reprendre' })
    const [strategy, observer] = within(resume).getAllByRole('listitem')
    expect(within(resume).getByRole('link', { name: 'strategy-ts' }).getAttribute('href')).toBe('/play/strategy-ts')
    expect(strategy?.textContent).toContain('il y a 2 heures')
    expect(within(resume).getByRole('link', { name: 'observer-ts · fix-it' })).toBeDefined()
    expect(observer?.textContent).toContain('il y a 30 secondes')
  })

  it('shows nothing without a project', () => {
    const { container } = render(<RecentProjects now={NOW} projects={[]} />)

    expect(container.childElementCount).toBe(0)
  })
})
