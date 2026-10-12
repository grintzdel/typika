import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { TemplateHealth } from '../domain/template-health.domain-model.ts'
import { HEALTH_DIR, readHealth, writeHealth } from './read-health.ts'

const HEALTHY: TemplateHealth = {
  status: 'healthy',
  checkedAt: '2026-10-12T03:00:00.000Z',
  brokenSince: null,
  checks: { boot: 'pass', tests: 'pass', exercises: 'pass', deps: 'skip' },
  runUrl: null,
}

const registry = () => mkdtemp(join(tmpdir(), 'typika-health-'))

describe('readHealth', () => {
  it('reads nothing from a registry that has no health folder', async () => {
    expect((await readHealth(await registry())).size).toBe(0)
  })

  it('reads back the state it writes, by template name', async () => {
    const root = await registry()

    await writeHealth(root, 'strategy-ts', HEALTHY)

    expect((await readHealth(root)).get('strategy-ts')).toEqual(HEALTHY)
  })

  it('rejects a health file that does not match its schema', async () => {
    const root = await registry()
    await mkdir(join(root, HEALTH_DIR))
    await writeFile(join(root, HEALTH_DIR, 'strategy-ts.json'), JSON.stringify({ ...HEALTHY, status: 'fine' }))

    await expect(readHealth(root)).rejects.toThrow(/strategy-ts\.json/)
  })
})
