import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { hubIndex } from '../../../__tests__/hub-index.factory.ts'
import { makeHubTestLayer } from '../../hub.test-layer.ts'
import { listHubTemplatesProgram } from './list-hub-templates.program.ts'

describe('listHubTemplatesProgram', () => {
  it('lists the templates with the options of each facet', async () => {
    const { templates, facets } = await Effect.runPromise(
      listHubTemplatesProgram.pipe(Effect.provide(makeHubTestLayer(hubIndex())))
    )

    expect(templates).toHaveLength(4)
    expect(facets.topics.map((option) => option.category)).toEqual(['architecture', 'principle', 'design-pattern'])
  })
})
