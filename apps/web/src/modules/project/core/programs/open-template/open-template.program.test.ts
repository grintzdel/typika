import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { templateFiles } from '../../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../project.test-layer.ts'
import { openTemplateProgram } from './open-template.program.ts'

const open = (name: string, templates = { 'sample-ts': templateFiles() }) =>
  Effect.runPromiseExit(openTemplateProgram(name).pipe(Effect.provide(makeProjectTestLayer(templates))))

const failureOf = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && exit.cause.reasons[0]

describe('openTemplateProgram', () => {
  it('opens a template with its manifest and files', async () => {
    const exit = await open('sample-ts')

    expect(Exit.isSuccess(exit) && exit.value.manifest.name).toBe('sample-ts')
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
  })

  it('leaves the exercises out of the project', async () => {
    const exit = await open('sample-ts')

    expect(Exit.isSuccess(exit) && [...exit.value.files.keys()].toSorted()).toEqual([
      'LICENSE',
      'README.md',
      'src/main.ts',
      'tests/a.test.ts',
      'typika.toml',
    ])
  })

  it('fails when no template has that name', async () => {
    expect(failureOf(await open('missing-ts'))).toMatchObject({
      error: { _tag: 'ProjectTemplateNotFoundError', name: 'missing-ts' },
    })
  })

  it('fails with the manifest issues of an invalid template', async () => {
    const files = templateFiles()
    files.delete('LICENSE')

    const exit = await open('sample-ts', { 'sample-ts': files })

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectTemplateInvalidError', name: 'sample-ts' } })
  })
})
