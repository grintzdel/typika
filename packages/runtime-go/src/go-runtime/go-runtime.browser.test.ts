import {
  checkTestEventSequence,
  RuntimeCompileError,
  RuntimeTimeoutError,
  type ProcessOutput,
  type RuntimeSession,
  type TestEvent,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Stream from 'effect/Stream'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { projectPath, strategyGoProject } from '../__tests__/template.factory.ts'
import { GoAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import { isAssetManifest, type GoAssetManifest } from '../domain/go-assets.domain-model.ts'
import { GO_ASSET_CACHE_PREFIX, makeGoRuntime } from './go-runtime.ts'

const manifestUrl = new URL('../../assets/go1.24.5/manifest.json', import.meta.url)
const assetsUrl = new URL('.', manifestUrl).href
const fetchedManifest: unknown = await fetch(manifestUrl).then((response) => response.json())
if (!isAssetManifest(fetchedManifest)) throw new Error(`Malformed ${manifestUrl.href}`)
const assetManifest = fetchedManifest
const LOADED_ASSETS = [GoAssetFile.COMPILE, GoAssetFile.LINK, GoAssetFile.STD]

const runtime = makeGoRuntime({ assetsUrl, manifest: assetManifest, limits: { runTimeoutMs: 5_000 } })

const withSession = <A, E>(
  overrides: Parameters<typeof strategyGoProject>[0],
  use: (session: RuntimeSession) => Effect.Effect<A, E>
) => Effect.runPromise(Effect.scoped(Effect.flatMap(runtime.boot(strategyGoProject(overrides)), use)))

const collectRun = (session: RuntimeSession) =>
  Stream.runCollect(session.run({ command: 'cmd/shop/main.go', args: [] }))

const stdoutOf = (outputs: ReadonlyArray<ProcessOutput>) =>
  outputs.flatMap((output) => (output._tag === 'Stdout' ? [output.chunk] : [])).join('')

const finishedOf = (events: ReadonlyArray<TestEvent>) => events.find((event) => event._tag === 'RunFinished')

const clearCaches = async () => {
  for (const name of await caches.keys()) if (name.startsWith(GO_ASSET_CACHE_PREFIX)) await caches.delete(name)
}

describe('go runtime', () => {
  beforeAll(clearCaches)
  afterEach(() => vi.restoreAllMocks())

  it('reports the download of each asset, then reads them from the cache', async () => {
    const progress = await Effect.runPromise(
      Stream.runCollect(makeGoRuntime({ assetsUrl, manifest: assetManifest }).load)
    )
    for (const name of LOADED_ASSETS) {
      const bytes = assetManifest.files.find((file) => file.name === name)?.bytes
      expect(progress.findLast((item) => item.asset === name)).toEqual({
        asset: name,
        loadedBytes: bytes,
        totalBytes: bytes,
      })
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await Effect.runPromise(Stream.runDrain(makeGoRuntime({ assetsUrl, manifest: assetManifest }).load))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses an asset whose hash does not match the manifest', async () => {
    const tampered: GoAssetManifest = {
      ...assetManifest,
      key: 'tampered',
      files: assetManifest.files.map((file) =>
        file.name === GoAssetFile.LINK ? { ...file, sha256: '0'.repeat(64) } : file
      ),
    }
    const exit = await Effect.runPromiseExit(Stream.runDrain(makeGoRuntime({ assetsUrl, manifest: tampered }).load))
    expect(Exit.isFailure(exit) && Cause.findErrorOption(exit.cause)).toMatchObject({
      value: { _tag: 'RuntimeAssetLoadError', asset: GoAssetFile.LINK },
    })
    await caches.delete(`${GO_ASSET_CACHE_PREFIX}tampered`)
  })

  it('runs the tests of strategy-go green', async () => {
    const events = await withSession({}, (session) => Stream.runCollect(session.test({})))
    expect(checkTestEventSequence(events)).toEqual([])
    expect(finishedOf(events)).toMatchObject({ status: 'passed', passed: 12, failed: 0 })
  })

  it('runs the entry of strategy-go', async () => {
    const outputs = await withSession({}, collectRun)
    expect(stdoutOf(outputs)).toContain('Ada (regular)')
    expect(outputs.at(-1)).toEqual({ _tag: 'Exit', code: 0 })
  })

  it('tests the files written after the boot', async () => {
    const events = await withSession({}, (session) =>
      session.fs
        .writeFile(projectPath('internal/checkout/broken_test.go'), brokenTest)
        .pipe(Effect.andThen(Stream.runCollect(session.test({}))))
    )
    expect(finishedOf(events)).toMatchObject({ status: 'failed', failed: 1 })
    const failed = events.find((event) => event._tag === 'TestFailed')
    expect(failed).toMatchObject({ name: 'TestBroken', file: 'internal/checkout/broken_test.go' })
  })

  it('fails a run that does not compile with located diagnostics', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.scoped(Effect.flatMap(runtime.boot(strategyGoProject({ 'cmd/shop/main.go': brokenMain })), collectRun))
    )
    const error = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : undefined
    expect(error?._tag === 'Some' && error.value).toBeInstanceOf(RuntimeCompileError)
    expect(
      error?._tag === 'Some' && error.value._tag === 'RuntimeCompileError' && error.value.diagnostics[0]
    ).toMatchObject({
      location: { file: 'cmd/shop/main.go', line: 4 },
    })
  })

  it('stops an endless program at the time limit, then runs again', async () => {
    const outcome = await withSession({ 'cmd/shop/main.go': endlessMain }, (session) =>
      Effect.gen(function* () {
        const stopped = yield* Effect.exit(collectRun(session))
        yield* session.fs.writeFile(projectPath('cmd/shop/main.go'), helloMain)
        const again = yield* collectRun(session)
        return { stopped, again }
      })
    )
    expect(Exit.isFailure(outcome.stopped) && Cause.findErrorOption(outcome.stopped.cause)).toMatchObject({
      value: new RuntimeTimeoutError({ limitMs: 5_000 }),
    })
    expect(stdoutOf(outcome.again)).toBe('hello\n')
  }, 30_000)
})

const brokenTest = `package checkout

import "testing"

func TestBroken(t *testing.T) {
	t.Fatal("broken on purpose")
}
`

const brokenMain = `package main

func main() {
	undefinedCall()
}
`

const endlessMain = `package main

func main() {
	for {
	}
}
`

const helloMain = `package main

import "fmt"

func main() {
	fmt.Println("hello")
}
`
