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
  'decorator/ts',
  'decorator-base/ts',
  'factory-method/ts',
  'factory-method-base/ts',
  'liskov-substitution/ts',
  'liskov-substitution-base/ts',
  'observer/ts',
  'observer-base/ts',
  'open-closed/ts',
  'open-closed-base/ts',
  'single-responsibility/ts',
  'single-responsibility-base/ts',
  'strategy/ts',
  'strategy-base/ts',
]

const testFilesOf = async (root: string) =>
  (await readdir(join(root, 'tests'), { recursive: true }))
    .filter((name) => name.endsWith('.test.ts'))
    .toSorted()
    .map((name) => join(root, 'tests', name))

describe('TypeScript templates', () => {
  it.each(TYPESCRIPT_TEMPLATES)('runs the tests of %s green', async (template) => {
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
