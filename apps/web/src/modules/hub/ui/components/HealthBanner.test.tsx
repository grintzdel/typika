import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HealthBanner } from './HealthBanner.tsx'

describe('HealthBanner', () => {
  it('says a broken template fails its check and links to the run', () => {
    render(
      <HealthBanner
        health={{ status: 'broken', runUrl: 'https://ci.example/runs/1' }}
        alternatives="/templates?topic=x"
      />
    )

    expect(screen.getByRole('note').textContent).toContain(
      'Ce template échoue actuellement à la vérification automatique.'
    )
    expect(screen.getByRole('link', { name: 'Voir le run de vérification' }).getAttribute('href')).toBe(
      'https://ci.example/runs/1'
    )
  })

  it('says a template is deprecated and offers alternatives', () => {
    render(<HealthBanner health={{ status: 'deprecated', runUrl: null }} alternatives="/templates?topic=x" />)

    expect(screen.getByRole('note').textContent).toContain('Ce template est déprécié')
    expect(screen.getByRole('link', { name: 'Voir des alternatives' }).getAttribute('href')).toBe('/templates?topic=x')
    expect(screen.queryByRole('link', { name: 'Voir le run de vérification' })).toBeNull()
  })

  it('shows nothing for a healthy, a degraded or an unchecked template', () => {
    const { container } = render(
      <>
        <HealthBanner health={{ status: 'healthy', runUrl: null }} alternatives="/templates" />
        <HealthBanner health={{ status: 'degraded', runUrl: null }} alternatives="/templates" />
        <HealthBanner health={undefined} alternatives="/templates" />
      </>
    )

    expect(container.textContent).toBe('')
  })
})
