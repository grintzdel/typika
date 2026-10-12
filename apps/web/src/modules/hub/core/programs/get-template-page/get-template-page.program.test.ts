import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { hubIndex } from '../../../__tests__/hub-index.factory.ts'
import { makeHubTestLayer } from '../../hub.test-layer.ts'
import { getTemplatePageProgram } from './get-template-page.program.ts'

const pageOf = (name: string) =>
  Effect.runPromise(getTemplatePageProgram(name).pipe(Effect.provide(makeHubTestLayer(hubIndex()))))

describe('getTemplatePageProgram', () => {
  it('describes a template of the index', async () => {
    expect(await pageOf('strategy-ts')).toMatchObject({ name: 'strategy-ts', base: 'strategy-base-ts' })
  })

  it('finds nothing for an unknown name', async () => {
    expect(await pageOf('nope')).toBeUndefined()
  })
})
