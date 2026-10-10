import { parseManifest } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { describe, expect, it } from 'vitest'

import { makeFakeRuntime, MANIFEST_TOML, projectFixture, projectPath } from '../../../__tests__/runtime.factory.ts'
import { runProjectProgram } from './run-project.program.ts'

const runWith = (
  toml: string,
  files: Record<string, string>,
  writes: Parameters<typeof runProjectProgram>[0]['writes']
) => {
  const snapshot = projectFixture(files, toml)
  return Effect.runPromise(
    Effect.scoped(
      Effect.flatMap(makeFakeRuntime().port.boot(snapshot), (session) =>
        Stream.runCollect(runProjectProgram({ session, manifest: snapshot.manifest, writes }))
      )
    )
  )
}

describe('runProjectProgram', () => {
  it('runs the entry and accumulates its output', async () => {
    const states = await runWith(MANIFEST_TOML, { 'src/main.ts': 'hello' }, [])

    expect(states.at(-1)).toMatchObject({
      entries: [{ stream: 'stdout', text: 'hello' }],
      outcome: { _tag: 'Exited', code: 0 },
    })
  })

  it('starts with an empty running console', async () => {
    const states = await runWith(MANIFEST_TOML, {}, [])

    expect(states[0]).toMatchObject({ entries: [], outcome: { _tag: 'Running' } })
  })

  it('writes the pending files before running', async () => {
    const states = await runWith(MANIFEST_TOML, { 'src/main.ts': 'hello' }, [[projectPath('src/main.ts'), 'edited']])

    expect(states.at(-1)?.entries).toEqual([{ stream: 'stdout', text: 'edited' }])
  })

  it('runs commands.start when the manifest sets it', async () => {
    const toml = `${MANIFEST_TOML}\n[commands]\nstart = "src/other.ts"\n`
    expect(Effect.runSync(parseManifest(toml)).commands?.start).toBe('src/other.ts')

    const states = await runWith(toml, { 'src/main.ts': 'main', 'src/other.ts': 'other' }, [])

    expect(states.at(-1)?.entries).toEqual([{ stream: 'stdout', text: 'other' }])
  })

  it('ends with an interrupted console when the runtime preempts the run', async () => {
    const toml = `${MANIFEST_TOML}\n[commands]\nstart = "preempted"\n`

    const states = await runWith(toml, { preempted: '' }, [])

    expect(states.at(-1)?.outcome).toEqual({ _tag: 'Interrupted' })
  })

  it('turns a compile error into console diagnostics', async () => {
    const toml = `${MANIFEST_TOML}\n[commands]\nstart = "broken"\n`

    const states = await runWith(toml, { broken: '' }, [])

    expect(states.at(-1)).toMatchObject({
      entries: [{ stream: 'diagnostic', text: 'Unexpected end of file' }],
      outcome: { _tag: 'CompileFailed' },
    })
  })
})
