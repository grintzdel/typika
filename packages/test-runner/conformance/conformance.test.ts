import { execFile } from 'node:child_process'
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { checkTestEventSequence, TestEventSchema } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'
import { beforeAll, describe, expect, it } from 'vitest'

import { runTests, type TestEvent } from '../src/runner.ts'

const CONFORMANCE_DIR = import.meta.dirname
const decodeTestEvent = Schema.decodeUnknownSync(Schema.fromJsonString(TestEventSchema))
const VITEST_BIN = join(CONFORMANCE_DIR, '..', 'node_modules', '.bin', 'vitest')

const fixtureFiles = async () =>
  (await readdir(join(CONFORMANCE_DIR, 'fixtures')))
    .filter((name) => name.endsWith('.test.ts'))
    .toSorted()
    .map((name) => `fixtures/${name}`)

const runWithVitest = async (): Promise<ReadonlyArray<TestEvent>> => {
  const output = join(await mkdtemp(join(tmpdir(), 'typika-conformance-')), 'events.jsonl')
  await promisify(execFile)(VITEST_BIN, ['run', '--config', 'vitest.config.ts'], {
    cwd: CONFORMANCE_DIR,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', TYPIKA_EVENTS_FILE: output },
  }).catch(() => undefined)
  const lines = (await readFile(output, 'utf8')).trim().split('\n')
  return lines.map((line) => decodeTestEvent(line))
}

const runWithTypika = async (): Promise<ReadonlyArray<TestEvent>> => {
  const events: Array<TestEvent> = []
  const files = (await fixtureFiles()).map((path) => ({
    path,
    load: () => import(pathToFileURL(join(CONFORMANCE_DIR, path)).href),
  }))
  await runTests({ runId: 'typika', files, emit: (event) => events.push(event) })
  return events
}

const normalize = (events: ReadonlyArray<TestEvent>) =>
  events
    .filter((event) => event._tag !== 'Output' || event.testId !== undefined)
    .map((event) => {
      const { runId: _runId, ...rest } = event
      if ('startedAt' in rest) return { ...rest, startedAt: 0 }
      if (rest._tag === 'TestFailed') {
        return { ...rest, durationMs: 0, failure: { message: rest.failure.message.split('\n')[0] } }
      }
      if ('durationMs' in rest) return { ...rest, durationMs: 0 }
      return rest
    })

describe('conformance with Vitest', () => {
  let vitestEvents: ReadonlyArray<TestEvent> = []
  let typikaEvents: ReadonlyArray<TestEvent> = []

  beforeAll(async () => {
    vitestEvents = await runWithVitest()
    typikaEvents = await runWithTypika()
  }, 60_000)

  it('emits the same events as Vitest for every fixture', () => {
    expect(normalize(typikaEvents)).toEqual(normalize(vitestEvents))
  })

  it('emits events that follow the TestEvent protocol', () => {
    expect(typikaEvents.every(Schema.is(TestEventSchema))).toBe(true)
    expect(checkTestEventSequence(typikaEvents)).toEqual([])
  })

  it('translates Vitest into events that follow the TestEvent protocol', () => {
    expect(vitestEvents.every(Schema.is(TestEventSchema))).toBe(true)
    expect(checkTestEventSequence(vitestEvents)).toEqual([])
  })
})
