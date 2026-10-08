import { describe, expect, it } from 'vitest'

import { manifestFixture, toToml, type ManifestInput } from '../__tests__/manifest.factory.ts'
import { codesOf, issuesOf, valueOf } from '../__tests__/run-issues.ts'
import { numberedLines, templateFilesFixture } from '../__tests__/template-files.factory.ts'
import type { TemplateFiles } from '../domain/template-files.domain-model.ts'
import { parseManifest } from '../parse-manifest/parse-manifest.ts'
import { checkWorkspace, type CheckWorkspaceOptions } from './check-workspace.ts'

const check = async (
  files: TemplateFiles,
  manifest: ManifestInput = manifestFixture(),
  options?: CheckWorkspaceOptions
) => checkWorkspace(await valueOf(parseManifest(toToml(manifest))), files, options)

const issuesFor = async (files: TemplateFiles, manifest?: ManifestInput, options?: CheckWorkspaceOptions) =>
  codesOf(await issuesOf(await check(files, manifest, options)))

const contextStep = (frontMatter: string) =>
  templateFilesFixture({ 'tour/02-context.md': `+++\nid = "context"\ntitle = "Context"\n${frontMatter}\n+++\n` })

describe('checkWorkspace', () => {
  it('returns the parsed tour steps of a valid template', async () => {
    const report = await valueOf(await check(templateFilesFixture()))

    expect(report.tourSteps.map((step) => step.id)).toEqual(['overview', 'context'])
    expect(report.warnings).toEqual([])
  })

  it('requires the entry, LICENSE and README.md', async () => {
    const files = templateFilesFixture({ 'src/main.ts': undefined, LICENSE: undefined, 'README.md': undefined })
    const issues = await issuesOf(await check(files))

    expect(codesOf(issues)).toEqual([
      'E_ENTRY_NOT_FOUND runtime.entry',
      'E_LICENSE_FILE_MISSING LICENSE',
      'E_README_FILE_MISSING README.md',
    ])
    expect(issues[0]?.message).toBe('Entry file "src/main.ts" does not exist.')
  })

  it('requires the file named by commands.start', async () => {
    expect(await issuesFor(templateFilesFixture(), manifestFixture({ commands: { start: 'src/other.ts' } }))).toEqual([
      'E_ENTRY_NOT_FOUND commands.start',
    ])
  })

  it('reports a missing tour step', async () => {
    expect(await issuesFor(templateFilesFixture({ 'tour/02-context.md': undefined }))).toEqual([
      'E_TOUR_STEP_NOT_FOUND tour.steps[1]',
    ])
  })

  it('reports an invalid front-matter on the step file', async () => {
    expect(await issuesFor(templateFilesFixture({ 'tour/02-context.md': '# Context\n' }))).toEqual([
      'E_TOUR_FRONTMATTER tour/02-context.md',
    ])
  })

  it('reports files of a step that do not exist', async () => {
    const issues = await issuesOf(await check(contextStep('file = "src/missing.ts"\nalso = ["src/gone.ts"]')))

    expect(issues.map((issue) => issue.message)).toEqual([
      'Tour step "tour/02-context.md": file "src/missing.ts" does not exist.',
      'Tour step "tour/02-context.md": file "src/gone.ts" does not exist.',
    ])
  })

  it('reports duplicate step ids', async () => {
    const files = templateFilesFixture({ 'tour/02-context.md': '+++\nid = "overview"\ntitle = "Again"\n+++\n' })

    expect(await issuesFor(files)).toEqual(['E_TOUR_DUPLICATE_ID tour/02-context.md'])
  })

  it('reports a line range past the end of the file', async () => {
    const files = templateFilesFixture({
      'src/checkout/shipping-quote.ts': numberedLines(20),
      'tour/02-context.md':
        '+++\nid = "context"\ntitle = "Context"\nfile = "src/checkout/shipping-quote.ts"\nlines = "12-27"\n+++\n',
    })
    const issues = await issuesOf(await check(files))

    expect(codesOf(issues)).toEqual(['E_TOUR_ANCHOR_OUT_OF_RANGE tour/02-context.md'])
    expect(issues[0]?.message).toBe(
      'Tour step "context": lines 12-27 are outside "src/checkout/shipping-quote.ts" (20 lines).'
    )
  })

  it.each([
    ['a missing region', 'missing'],
    ['a region that is never closed', 'open'],
  ])('reports %s', async (_label, region) => {
    const files = templateFilesFixture({
      'src/checkout/shipping-quote.ts': '// #region tour:context\n// #endregion\n// #region tour:open\nx\n',
      'tour/02-context.md': `+++\nid = "context"\ntitle = "Context"\nfile = "src/checkout/shipping-quote.ts"\nregion = "${region}"\n+++\n`,
    })
    const issues = await issuesOf(await check(files))

    expect(codesOf(issues)).toEqual(['E_TOUR_REGION_NOT_FOUND tour/02-context.md'])
    expect(issues[0]?.message).toBe(
      `Tour step "context": region "${region}" not found in "src/checkout/shipping-quote.ts".`
    )
  })

  it('accepts indented region markers', async () => {
    const files = templateFilesFixture({
      'src/checkout/shipping-quote.ts': 'class A {\n  // #region tour:context\n  run() {}\n  // #endregion\n}\n',
    })

    expect(await issuesFor(files)).toEqual([])
  })

  it('reports missing exercise files', async () => {
    const files = templateFilesFixture({
      'exercises/implement-express/README.md': undefined,
      'exercises/implement-express/hint-1.md': undefined,
      'exercises/implement-express/solution/src/checkout/express.ts': undefined,
      'tests/express-shipping.test.ts': undefined,
    })
    const issues = await issuesOf(await check(files))

    expect(codesOf(issues)).toEqual([
      'E_EXERCISE_PATH_NOT_FOUND exercises/implement-express/README.md',
      'E_EXERCISE_PATH_NOT_FOUND exercises/implement-express/solution',
      'E_EXERCISE_PATH_NOT_FOUND exercises/implement-express/hint-1.md',
      'E_EXERCISE_PATH_NOT_FOUND tests/express-shipping.test.ts',
    ])
    expect(issues[0]?.message).toBe(
      'Exercise "implement-express": "exercises/implement-express/README.md" does not exist.'
    )
  })

  it('finds a failing test of an exercise in its start overlay', async () => {
    const files = templateFilesFixture({
      'tests/express-shipping.test.ts': undefined,
      'exercises/implement-express/start/tests/express-shipping.test.ts': '',
    })

    expect(await issuesFor(files)).toEqual([])
  })

  it('leaves the failing tests of an exercise that starts from the base to the registry', async () => {
    const files = templateFilesFixture({
      'exercises/add-pickup-point-option/start/tests/pickup-point.test.ts': undefined,
    })

    expect(await issuesFor(files)).toEqual([])
  })

  it('treats a failing test removed by .typika-remove as missing', async () => {
    const files = templateFilesFixture({
      'exercises/implement-express/start/.typika-remove': 'tests/express-shipping.test.ts\n',
    })

    expect(await issuesFor(files)).toEqual(['E_EXERCISE_PATH_NOT_FOUND tests/express-shipping.test.ts'])
  })

  it('warns about undeclared exercise folders and ignores files at the root of exercises/', async () => {
    const files = templateFilesFixture({ 'exercises/old-exercise/README.md': '', 'exercises/go.mod': 'module x\n' })
    const report = await valueOf(await check(files))

    expect(codesOf(report.warnings)).toEqual(['W_EXERCISE_UNDECLARED exercises/old-exercise'])
  })

  it('warns about topics missing from the registry vocabulary when it is known', async () => {
    const knownTopics = new Set(['design-pattern/behavioral/strategy'])
    const report = await valueOf(await check(templateFilesFixture(), manifestFixture(), { knownTopics }))

    expect(codesOf(report.warnings)).toEqual(['W_UNKNOWN_TOPIC facets.topic[1]'])
  })

  it('warns when a template exceeds the size limits', async () => {
    const manyFiles = Object.fromEntries(Array.from({ length: 200 }, (_, index) => [`src/generated/f${index}.ts`, '']))
    const files = templateFilesFixture({
      ...manyFiles,
      'src/big.ts': 'x'.repeat(1_000_001),
      'tour/diagram.png': new Uint8Array(200_001),
      'tour/archive.zip': new Uint8Array(10),
    })
    const report = await valueOf(await check(files))

    expect(report.warnings.map((warning) => warning.message)).toEqual([
      'Template exceeds 200 files: 212.',
      expect.stringMatching(/^Template exceeds 1 MB of text: 1\d{6} bytes\.$/),
      'Template exceeds 200 KB per image: "tour/diagram.png" is 200001 bytes.',
      'Template exceeds the image-only rule for binary files: "tour/archive.zip".',
    ])
  })

  it('keeps the warnings next to the errors when the workspace is invalid', async () => {
    const files = templateFilesFixture({ LICENSE: undefined, 'exercises/old-exercise/README.md': '' })

    expect(await issuesFor(files)).toEqual([
      'E_LICENSE_FILE_MISSING LICENSE',
      'W_EXERCISE_UNDECLARED exercises/old-exercise',
    ])
  })
})
