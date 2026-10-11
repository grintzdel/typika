import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { templateFiles, templateToml } from '../../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../project.test-layer.ts'
import { listTemplateSummariesProgram } from './list-template-summaries.program.ts'

const summariesOf = (templates: Parameters<typeof makeProjectTestLayer>[0]) =>
  Effect.runPromiseExit(listTemplateSummariesProgram.pipe(Effect.provide(makeProjectTestLayer(templates))))

const withToml = (name: string, toml: string) => templateFiles(name, { 'typika.toml': toml })

describe('listTemplateSummariesProgram', () => {
  it('summarises each embedded template from its manifest', async () => {
    const exit = await summariesOf({ 'sample-ts': templateFiles('sample-ts') })

    expect(Exit.isSuccess(exit) && exit.value).toEqual([
      {
        name: 'sample-ts',
        title: 'Sample',
        summary: 'A sample template.',
        language: 'typescript',
        level: 'intermediate',
      },
    ])
  })

  it('leaves out the bases', async () => {
    const exit = await summariesOf({
      'sample-ts': templateFiles('sample-ts'),
      'sample-base-ts': withToml(
        'sample-base-ts',
        templateToml('sample-base-ts').replace('license', 'role = "base"\nlicense')
      ),
    })

    expect(Exit.isSuccess(exit) && exit.value.map((summary) => summary.name)).toEqual(['sample-ts'])
  })

  it('sorts the templates by title, then by language', async () => {
    const exit = await summariesOf({
      'zebra-ts': withToml('zebra-ts', templateToml('zebra-ts').replace('title = "Sample"', 'title = "Zebra"')),
      'sample-js': withToml(
        'sample-js',
        templateToml('sample-js').replace('language = "typescript"', 'language = "javascript"')
      ),
      'sample-ts': templateFiles('sample-ts'),
    })

    expect(Exit.isSuccess(exit) && exit.value.map((summary) => summary.name)).toEqual([
      'sample-js',
      'sample-ts',
      'zebra-ts',
    ])
  })

  it('skips a template whose manifest cannot be read', async () => {
    const exit = await summariesOf({
      'sample-ts': templateFiles('sample-ts'),
      'broken-ts': withToml('broken-ts', 'schema = 1\nname = "broken-ts"\n'),
    })

    expect(Exit.isSuccess(exit) && exit.value.map((summary) => summary.name)).toEqual(['sample-ts'])
  })
})
