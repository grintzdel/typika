import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { templateFiles, templateToml } from '../../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../project.test-layer.ts'
import { listCatalogueProgram } from './list-catalogue.program.ts'

describe('listCatalogueProgram', () => {
  it('lists the templates of the catalogue a project can start from, by title', async () => {
    const templates = {
      'zebra-ts': templateFiles('zebra-ts', { 'typika.toml': templateToml('zebra-ts').replace('Sample', 'Zebra') }),
      'alpha-go': templateFiles('alpha-go', { 'typika.toml': templateToml('alpha-go').replace('Sample', 'Alpha') }),
      'alpha-base-ts': templateFiles('alpha-base-ts', {
        'typika.toml': templateToml('alpha-base-ts').replace('authors =', 'role = "base"\nauthors ='),
      }),
    }

    const catalogue = await Effect.runPromise(
      listCatalogueProgram.pipe(Effect.provide(makeProjectTestLayer(templates)))
    )

    expect(catalogue).toEqual([
      { name: 'alpha-go', title: 'Alpha', language: 'typescript' },
      { name: 'zebra-ts', title: 'Zebra', language: 'typescript' },
    ])
  })
})
