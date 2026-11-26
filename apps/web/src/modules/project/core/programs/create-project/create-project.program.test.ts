import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectPath } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer, testRefOf } from '../../project.test-layer.ts'
import { copyTemplateProgram, createBlankProjectProgram } from './create-project.program.ts'

describe('createBlankProjectProgram', () => {
  it('stores a personal project whose starting state is its skeleton', async () => {
    const storage = makeProjectStorageInMemory()

    const id = await Effect.runPromise(
      createBlankProjectProgram({ name: 'My sandbox', language: 'go' }).pipe(
        Effect.provide(makeProjectTestLayer({}, storage))
      )
    )

    const stored = storage.projects.get(id)
    expect(stored?.record).toMatchObject({
      name: 'My sandbox',
      origin: { kind: 'personal', name: 'my-sandbox', language: 'go' },
    })
    expect(stored?.record.ref).toBeUndefined()
    expect(stored?.files.get(projectPath('go.mod'))).toContain('module ')
    expect(stored?.record.baseline).toEqual(Object.fromEntries(stored?.files ?? []))
  })

  it('gives each new project its own id', async () => {
    const layer = makeProjectTestLayer({})
    const create = createBlankProjectProgram({ name: 'twice', language: 'typescript' }).pipe(Effect.provide(layer))

    const [first, second] = await Effect.runPromise(Effect.all([create, create]))

    expect(first).not.toBe(second)
  })
})

describe('copyTemplateProgram', () => {
  it('copies a template of the catalogue into a personal project, without its exercises', async () => {
    const storage = makeProjectStorageInMemory()

    const id = await Effect.runPromise(
      copyTemplateProgram({ template: 'sample-ts', name: 'My strategy' }).pipe(
        Effect.provide(makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage))
      )
    )

    const stored = storage.projects.get(id)
    expect(stored?.record).toMatchObject({
      name: 'My strategy',
      origin: { kind: 'personal', name: 'sample-ts', language: 'typescript' },
      ref: testRefOf('sample-ts'),
    })
    expect(stored?.files.get(projectPath('src/main.ts'))).toBe("console.log('hello')\n")
    expect([...(stored?.files.keys() ?? [])].some((path) => path.startsWith('exercises/'))).toBe(false)
    expect(stored?.record.baseline).toEqual(Object.fromEntries(stored?.files ?? []))
  })

  it('fails for a template that is not in the catalogue', async () => {
    const exit = await Effect.runPromiseExit(
      copyTemplateProgram({ template: 'missing-ts', name: 'copy' }).pipe(Effect.provide(makeProjectTestLayer({})))
    )

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateNotFoundError', name: 'missing-ts' },
    })
  })
})
