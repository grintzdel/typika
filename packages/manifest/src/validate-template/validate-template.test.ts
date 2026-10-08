import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { manifestFixture, toToml } from '../__tests__/manifest.factory.ts'
import { codesOf, issuesOf, valueOf } from '../__tests__/run-issues.ts'
import { templateFilesFixture } from '../__tests__/template-files.factory.ts'
import { ManifestNotFoundError } from '../domain/errors/manifest-not-found.error.ts'
import type { TemplateFiles } from '../domain/template-files.domain-model.ts'
import { validateTemplate } from './validate-template.ts'

const TEMPLATES_ROOT = join(import.meta.dirname, '../../../../templates')

const loadTemplate = (directory: string): TemplateFiles =>
  new Map(
    execFileSync('git', ['ls-files', '-z'], { cwd: directory, encoding: 'utf8' })
      .split('\0')
      .filter((path) => path !== '')
      .map((path) => [path, readFileSync(join(directory, path), 'utf8')] as const)
  )

const officialTemplates = readdirSync(TEMPLATES_ROOT).flatMap((concept) =>
  readdirSync(join(TEMPLATES_ROOT, concept)).map((language) => join(concept, language))
)

describe('validateTemplate', () => {
  it('validates the manifest, then the workspace', async () => {
    const files = templateFilesFixture({ 'typika.toml': toToml(manifestFixture()) })
    const template = await valueOf(validateTemplate(files))

    expect(template.manifest.name).toBe('strategy-ts')
    expect(template.tourSteps).toHaveLength(2)
    expect(template.warnings).toEqual([])
  })

  it('does not check the workspace of an invalid manifest', async () => {
    const files = templateFilesFixture({ 'typika.toml': toToml(manifestFixture({ name: 'X' })), LICENSE: undefined })

    expect(codesOf(await issuesOf(validateTemplate(files)))).toEqual(['E_INVALID_VALUE name'])
  })

  it('fails when the folder has no typika.toml', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.flip(validateTemplate(templateFilesFixture({ 'typika.toml': undefined })))
    )

    expect(Exit.isSuccess(exit) && exit.value instanceof ManifestNotFoundError).toBe(true)
  })

  it.each(officialTemplates)('accepts the official template %s', async (template) => {
    const result = await valueOf(validateTemplate(loadTemplate(join(TEMPLATES_ROOT, template))))

    expect(result.warnings).toEqual([])
  })
})
