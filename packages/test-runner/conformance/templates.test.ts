import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import { checkTestEventSequence } from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import { runTests, type TestEvent } from '../src/runner.ts'

const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', '..', 'templates')
const TYPESCRIPT_TEMPLATES = [
  'adapter/ts',
  'adapter-base/ts',
  'composition-over-inheritance/ts',
  'composition-over-inheritance-base/ts',
  'cqrs/ts',
  'decorator/ts',
  'decorator-base/ts',
  'dependency-inversion/ts',
  'dependency-inversion-base/ts',
  'event-sourcing/ts',
  'factory-method/ts',
  'factory-method-base/ts',
  'hexagonal/ts',
  'interface-segregation/ts',
  'interface-segregation-base/ts',
  'liskov-substitution/ts',
  'liskov-substitution-base/ts',
  'naive-crud/ts',
  'observer/ts',
  'observer-base/ts',
  'open-closed/ts',
  'open-closed-base/ts',
  'outbox/ts',
  'single-responsibility/ts',
  'single-responsibility-base/ts',
  'state-machine/ts',
  'strategy/ts',
  'strategy-base/ts',
]

const JAVASCRIPT_TEMPLATES = [
  'composition-over-inheritance/js',
  'composition-over-inheritance-base/js',
  'decorator/js',
  'decorator-base/js',
  'observer/js',
  'observer-base/js',
]

const testFilesOf = async (root: string) =>
  (await readdir(join(root, 'tests'), { recursive: true }))
    .filter((name) => name.endsWith('.test.ts') || name.endsWith('.test.js'))
    .toSorted()
    .map((name) => join(root, 'tests', name))

describe('TypeScript and JavaScript templates', () => {
  it.each([...TYPESCRIPT_TEMPLATES, ...JAVASCRIPT_TEMPLATES])('runs the tests of %s green', async (template) => {
    const root = join(TEMPLATES_DIR, template)
    const files = (await testFilesOf(root)).map((file) => ({
      path: relative(root, file),
      load: () => import(pathToFileURL(file).href),
    }))
    const events: Array<TestEvent> = []

    await runTests({ runId: template, files, emit: (event) => events.push(event) })

    expect(checkTestEventSequence(events)).toEqual([])
    expect(events.filter((event) => event._tag === 'TestFailed')).toEqual([])
    expect(events.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'passed', failed: 0 })
  })
})
