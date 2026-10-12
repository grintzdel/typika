import { describe, expect, it } from 'vitest'

import type { HealthChecks, TemplateHealth } from '../domain/template-health.domain-model.ts'
import { computeHealth } from './compute-health.ts'

const PASSING: HealthChecks = { boot: 'pass', tests: 'pass', exercises: 'pass', deps: 'skip' }
const NOW = '2026-10-12T03:00:00.000Z'

const previous = (overrides: Partial<TemplateHealth> = {}): TemplateHealth => ({
  status: 'healthy',
  checkedAt: '2026-10-05T03:00:00.000Z',
  brokenSince: null,
  checks: PASSING,
  runUrl: null,
  ...overrides,
})

describe('computeHealth', () => {
  it('is healthy when every check passes or is skipped', () => {
    expect(computeHealth({ checks: PASSING, previous: undefined, checkedAt: NOW })).toEqual({
      status: 'healthy',
      checkedAt: NOW,
      brokenSince: null,
      checks: PASSING,
      runUrl: null,
    })
  })

  it('is degraded when a check only warns', () => {
    const health = computeHealth({ checks: { ...PASSING, boot: 'warn' }, previous: undefined, checkedAt: NOW })

    expect(health.status).toBe('degraded')
    expect(health.brokenSince).toBeNull()
  })

  it('is broken from the run that fails, and keeps that date while it stays broken', () => {
    const first = computeHealth({ checks: { ...PASSING, tests: 'fail' }, previous: previous(), checkedAt: NOW })
    const second = computeHealth({
      checks: { ...PASSING, exercises: 'fail' },
      previous: first,
      checkedAt: '2026-10-19T03:00:00.000Z',
    })

    expect(first).toMatchObject({ status: 'broken', brokenSince: NOW })
    expect(second).toMatchObject({ status: 'broken', brokenSince: NOW })
  })

  it('becomes healthy again and forgets when it broke', () => {
    const health = computeHealth({
      checks: PASSING,
      previous: previous({ status: 'broken', brokenSince: '2026-10-01T03:00:00.000Z' }),
      checkedAt: NOW,
    })

    expect(health).toMatchObject({ status: 'healthy', brokenSince: null })
  })

  it('is deprecated after 90 days broken without a break', () => {
    const brokenSince = '2026-07-14T03:00:00.000Z'

    expect(
      computeHealth({
        checks: { ...PASSING, boot: 'fail' },
        previous: previous({ status: 'broken', brokenSince }),
        checkedAt: NOW,
      })
    ).toMatchObject({ status: 'deprecated', brokenSince })
    expect(
      computeHealth({
        checks: { ...PASSING, boot: 'fail' },
        previous: previous({ status: 'broken', brokenSince: '2026-07-15T03:00:00.000Z' }),
        checkedAt: NOW,
      }).status
    ).toBe('broken')
  })

  it('is deprecated when the team decides so, whatever the checks', () => {
    expect(computeHealth({ checks: PASSING, previous: undefined, checkedAt: NOW, deprecated: true }).status).toBe(
      'deprecated'
    )
  })

  it('keeps the link to the run', () => {
    expect(computeHealth({ checks: PASSING, previous: undefined, checkedAt: NOW, runUrl: 'https://ci/1' }).runUrl).toBe(
      'https://ci/1'
    )
  })
})
