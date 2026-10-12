import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { hubIndex } from '../../../__tests__/hub-index.factory.ts'
import { makeHubTestLayer } from '../../hub.test-layer.ts'
import { listConceptsProgram } from './list-concepts.program.ts'

describe('listConceptsProgram', () => {
  it('lists the concepts of the index by category', async () => {
    const sections = await Effect.runPromise(listConceptsProgram.pipe(Effect.provide(makeHubTestLayer(hubIndex()))))

    expect(sections.map((section) => section.category)).toEqual(['architecture', 'design-pattern'])
  })
})
