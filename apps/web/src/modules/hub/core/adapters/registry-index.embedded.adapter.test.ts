import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { registryIndex } from '../../../shared/__tests__/registry-index.factory.ts'
import { makeRegistryIndexEmbedded } from './registry-index.embedded.adapter.ts'

describe('makeRegistryIndexEmbedded', () => {
  it('serves the index built with the app', async () => {
    const index = await Effect.runPromise(makeRegistryIndexEmbedded(registryIndex()).index)

    expect(index.templates.map((template) => template.name)).toEqual(['strategy-ts', 'strategy-base-ts'])
  })

  it('refuses an embedded index that does not match its schema', async () => {
    const exit = await Effect.runPromiseExit(makeRegistryIndexEmbedded({ schema: 1 }).index)

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({ error: { failure: 'invalid' } })
  })
})
