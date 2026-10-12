import * as Effect from 'effect/Effect'
import { describe, expect, it, vi } from 'vitest'

import { indexTemplate } from '../__tests__/index-template.factory.ts'
import type { TemplateHealth } from '../domain/template-health.domain-model.ts'
import { runHealth, type ProbeResult } from './run-health.ts'

const NOW = '2026-10-12T03:00:00.000Z'
const PASS: ProbeResult = { checks: { boot: 'pass', tests: 'pass', exercises: 'pass' }, notes: [] }
const FAIL: ProbeResult = {
  checks: { boot: 'pass', tests: 'fail', exercises: 'pass' },
  notes: ['tests: 2 failed'],
}

const probeOf = (...results: ReadonlyArray<ProbeResult>) => {
  const queue = [...results]
  return vi.fn(() => Effect.succeed(queue.shift() ?? PASS))
}

const run = (probe: ReturnType<typeof probeOf>, options: Partial<Parameters<typeof runHealth>[0]> = {}) =>
  Effect.runPromise(
    runHealth({
      templates: [indexTemplate('strategy-ts')],
      probe,
      previousOf: () => undefined,
      deprecatedOf: () => false,
      checkedAt: NOW,
      runUrl: null,
      ...options,
    })
  )

describe('runHealth', () => {
  it('writes a healthy state when the probe passes, without checking the dependencies yet', async () => {
    const [report] = await run(probeOf(PASS))

    expect(report).toEqual({
      name: 'strategy-ts',
      health: {
        status: 'healthy',
        checkedAt: NOW,
        brokenSince: null,
        checks: { boot: 'pass', tests: 'pass', exercises: 'pass', deps: 'skip' },
        runUrl: null,
      },
      notes: [],
    })
  })

  it('probes a failing template a second time before it calls it broken', async () => {
    const probe = probeOf(FAIL, FAIL)

    const [report] = await run(probe)

    expect(probe).toHaveBeenCalledTimes(2)
    expect(report).toMatchObject({ health: { status: 'broken', brokenSince: NOW }, notes: ['tests: 2 failed'] })
  })

  it('absorbs a failure that the second probe does not see', async () => {
    const [report] = await run(probeOf(FAIL, PASS))

    expect(report).toMatchObject({ health: { status: 'healthy' }, notes: [] })
  })

  it('carries the previous state of the template', async () => {
    const previous: TemplateHealth = {
      status: 'broken',
      checkedAt: '2026-10-05T03:00:00.000Z',
      brokenSince: '2026-10-05T03:00:00.000Z',
      checks: { boot: 'pass', tests: 'fail', exercises: 'pass', deps: 'skip' },
      runUrl: null,
    }

    const [report] = await run(probeOf(FAIL, FAIL), { previousOf: () => previous })

    expect(report).toMatchObject({ health: { status: 'broken', brokenSince: '2026-10-05T03:00:00.000Z' } })
  })

  it('applies the decision of the team to deprecate a template', async () => {
    const [report] = await run(probeOf(PASS), { deprecatedOf: (name) => name === 'strategy-ts' })

    expect(report).toMatchObject({ health: { status: 'deprecated' } })
  })

  it('skips the templates whose runtime the app does not run yet', async () => {
    const probe = probeOf()

    const reports = await run(probe, {
      templates: [indexTemplate('strategy-go', { manifest: { runtime: { kind: 'go' } } })],
    })

    expect(probe).not.toHaveBeenCalled()
    expect(reports).toEqual([{ name: 'strategy-go', health: undefined, notes: [] }])
  })
})
