import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeFakeRuntimePort } from '../__tests__/runtime-port.factory.ts'
import { RuntimeAssetLoadError } from '../domain/errors/runtime-asset-load.error.ts'
import { RuntimeUnsupportedError } from '../domain/errors/runtime-unsupported.error.ts'
import { makeRuntimeRegistry, RuntimeRegistry } from './runtime-registry.ts'

describe('makeRuntimeRegistry', () => {
  it('resolves a kind to the port its loader returns', async () => {
    const port = makeFakeRuntimePort('browser-js')
    const registry = makeRuntimeRegistry({ 'browser-js': () => Promise.resolve(port) })

    expect(await Effect.runPromise(registry.get('browser-js'))).toBe(port)
  })

  it('loads a runtime only once', async () => {
    const loader = vi.fn(() => Promise.resolve(makeFakeRuntimePort('go')))
    const registry = makeRuntimeRegistry({ go: loader })

    await Effect.runPromise(Effect.all([registry.get('go'), registry.get('go')]))

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('fails with RuntimeUnsupportedError for a kind without loader', async () => {
    const exit = await Effect.runPromiseExit(makeRuntimeRegistry({}).get('kotlin'))

    expect(exit).toEqual(Exit.fail(new RuntimeUnsupportedError({ kind: 'kotlin' })))
  })

  it('fails with RuntimeAssetLoadError when the chunk cannot load, then retries', async () => {
    const port = makeFakeRuntimePort('go')
    const cause = new Error('network')
    const loader = vi.fn<() => Promise<typeof port>>().mockRejectedValueOnce(cause).mockResolvedValueOnce(port)
    const registry = makeRuntimeRegistry({ go: loader })

    expect(await Effect.runPromiseExit(registry.get('go'))).toEqual(
      Exit.fail(new RuntimeAssetLoadError({ asset: 'runtime-go', cause }))
    )
    expect(await Effect.runPromise(registry.get('go'))).toBe(port)
  })

  it('is provided as the RuntimeRegistry service', async () => {
    const port = makeFakeRuntimePort('browser-js')
    const program = Effect.gen(function* () {
      const registry = yield* RuntimeRegistry
      return yield* registry.get('browser-js')
    })

    const resolved = await Effect.runPromise(
      program.pipe(
        Effect.provideService(RuntimeRegistry, makeRuntimeRegistry({ 'browser-js': () => Promise.resolve(port) }))
      )
    )

    expect(resolved).toBe(port)
  })
})
