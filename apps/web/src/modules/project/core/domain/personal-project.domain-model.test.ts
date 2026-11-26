import { DEFAULT_TEST_INCLUDE, Language, matchGlob, RUNTIME_OF_LANGUAGE } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectPath } from '../../__tests__/project.factory.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { blankProjectFiles, manifestNameOf, personalTemplateOf } from './personal-project.domain-model.ts'
import { projectFilesOf } from './project.domain-model.ts'

describe('manifestNameOf', () => {
  it('turns a project name into a kebab-case slug', () => {
    expect(manifestNameOf('  Mon Café, version 2!  ')).toBe('mon-cafe-version-2')
  })

  it('falls back to a default slug when too little of the name is left', () => {
    expect(manifestNameOf('é!')).toBe('my-project')
  })

  it('keeps the slug within 64 characters', () => {
    expect(manifestNameOf('a'.repeat(63) + ' b').length).toBeLessThanOrEqual(64)
    expect(manifestNameOf('a'.repeat(63) + ' b')).not.toMatch(/-$/)
  })
})

describe('blankProjectFiles', () => {
  it.each(Object.values(Language))('gives a valid %s project with an entry point and a test', async (language) => {
    const files = blankProjectFiles({ name: 'My sandbox', language })

    const { manifest } = await Effect.runPromise(personalTemplateOf(files))

    expect(manifest.name).toBe('my-sandbox')
    expect(manifest.title).toBe('My sandbox')
    expect(manifest.facets.language).toBe(language)
    expect(manifest.runtime.kind).toBe(RUNTIME_OF_LANGUAGE[language])
    expect(files.has(projectPath(manifest.runtime.entry))).toBe(true)
    const include = manifest.tests?.include ?? DEFAULT_TEST_INCLUDE[language]
    expect([...files.keys()].some((path) => include.some((glob) => matchGlob(glob)(path)))).toBe(true)
  })
})

describe('personalTemplateOf', () => {
  it('reads the manifest of a project and leaves its exercises out', async () => {
    const { manifest } = await Effect.runPromise(personalTemplateOf(projectFilesOf(templateFiles())))

    expect(manifest.name).toBe('sample-ts')
    expect(manifest.exercises).toEqual([])
  })

  it('fails without a manifest', async () => {
    const exit = await Effect.runPromiseExit(personalTemplateOf(projectFiles({ 'src/main.ts': '' })))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectManifestMissingError' },
    })
  })

  it('reports the issues of an invalid manifest', async () => {
    const exit = await Effect.runPromiseExit(
      personalTemplateOf(projectFiles({ 'typika.toml': 'schema = 1\nname = "Not A Slug"\n' }))
    )

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateInvalidError' },
    })
    expect(Exit.isFailure(exit) ? JSON.stringify(exit.cause) : '').toContain('"code":"E_')
  })

  it('reports a missing entry file', async () => {
    const files = new Map(blankProjectFiles({ name: 'sandbox', language: 'typescript' }))
    files.delete(projectPath('src/main.ts'))

    const exit = await Effect.runPromiseExit(personalTemplateOf(files))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateInvalidError', issues: [{ code: 'E_ENTRY_NOT_FOUND' }] },
    })
  })
})
