import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectPath } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { decodeSharePayload } from '../../domain/share-link.domain-model.ts'
import { makeProjectTestLayer, testRefOf } from '../../project.test-layer.ts'
import { openTemplateProgram } from '../open-template/open-template.program.ts'
import { createShareLinkProgram } from './create-share-link.program.ts'

const shareAfter = (key: string, edits: Readonly<Record<string, string>>) =>
  Effect.runPromise(
    openTemplateProgram(key).pipe(
      Effect.flatMap((project) =>
        createShareLinkProgram({
          project,
          files: new Map([
            ...project.files,
            ...Object.entries(edits).map(([path, content]) => [projectPath(path), content] as const),
          ]),
          origin: 'https://typika.dev',
        })
      ),
      Effect.provide(makeProjectTestLayer({ 'sample-ts': templateFiles() }))
    )
  )

const payloadOf = (url: string) => Effect.runPromise(decodeSharePayload(url.slice(url.indexOf('#') + 1)))

describe('createShareLinkProgram', () => {
  it('links the pinned template and the files changed since it', async () => {
    const link = await shareAfter('sample-ts', { 'src/main.ts': 'edited' })

    expect(link._tag).toBe('Ready')
    if (link._tag !== 'Ready') return
    expect(link.url.startsWith('https://typika.dev/s#1.')).toBe(true)
    expect(await payloadOf(link.url)).toEqual({
      n: 'sample-ts',
      o: testRefOf('sample-ts'),
      r: 'browser-js',
      d: { 'src/main.ts': 'edited' },
    })
  })

  it('names the exercise of an exercise project', async () => {
    const link = await shareAfter('sample-ts#fix-it', { 'src/main.ts': 'fixed' })

    if (link._tag !== 'Ready') throw new Error('expected a link')
    expect(await payloadOf(link.url)).toMatchObject({ x: 'fix-it', d: { 'src/main.ts': 'fixed' } })
  })

  it('gives no link to a project too large for a URL', async () => {
    const noise = Array.from({ length: 4_000 }, (_, index) => ((index * 2_654_435_761) >>> 0).toString(36)).join('')

    const link = await shareAfter('sample-ts', { 'src/main.ts': noise })

    expect(link._tag).toBe('TooLong')
  })
})
