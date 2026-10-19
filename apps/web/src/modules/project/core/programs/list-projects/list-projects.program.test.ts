import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { ProjectIndexUnavailableError } from '../../domain/errors/project-index-unavailable.error.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { listProjectsProgram } from './list-projects.program.ts'

const template = projectRecord({ name: 'My pricing', updatedAt: 1_000 })
const exercise = projectRecord({
  origin: { kind: 'exercise', name: 'sample-ts', exercise: 'fix-it' },
  updatedAt: 3_000,
})
const unknown = projectRecord({ name: 'gone-ts', origin: { kind: 'template', name: 'gone-ts' }, updatedAt: 2_000 })
const storage = () =>
  makeProjectStorageInMemory([template, exercise, unknown].map((record) => ({ record, files: projectFiles({}) })))

describe('listProjectsProgram', () => {
  it('lists every project, most recent first, with its template and the path that opens it', async () => {
    const projects = await Effect.runPromise(
      listProjectsProgram.pipe(Effect.provide(makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage())))
    )

    expect(projects).toEqual([
      {
        id: exercise.id,
        name: 'sample-ts',
        path: `/p/${exercise.id}`,
        templateName: 'sample-ts',
        templateTitle: 'Sample',
        language: 'typescript',
        exercise: 'fix-it',
        updatedAt: 3_000,
      },
      {
        id: unknown.id,
        name: 'gone-ts',
        path: `/p/${unknown.id}`,
        templateName: 'gone-ts',
        templateTitle: undefined,
        language: undefined,
        exercise: undefined,
        updatedAt: 2_000,
      },
      {
        id: template.id,
        name: 'My pricing',
        path: `/p/${template.id}`,
        templateName: 'sample-ts',
        templateTitle: 'Sample',
        language: 'typescript',
        exercise: undefined,
        updatedAt: 1_000,
      },
    ])
  })

  it('still lists the projects when the template index is unavailable', async () => {
    const projects = await Effect.runPromise(
      listProjectsProgram.pipe(
        Effect.provide(
          Layer.mergeAll(
            makeProjectTestLayer({}, storage()),
            Layer.succeed(TemplateIndexPort, {
              entries: Effect.fail(new ProjectIndexUnavailableError({ failure: 'network', reason: 'offline' })),
            })
          )
        )
      )
    )

    expect(projects.map((project) => [project.name, project.templateTitle])).toEqual([
      ['sample-ts', undefined],
      ['gone-ts', undefined],
      ['My pricing', undefined],
    ])
  })
})
