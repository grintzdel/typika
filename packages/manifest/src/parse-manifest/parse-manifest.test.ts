import { describe, expect, it } from 'vitest'

import {
  baseManifestFixture,
  exercisesFixture,
  facetsFixture,
  manifestFixture,
  toToml,
} from '../__tests__/manifest.factory.ts'
import { codesOf, issuesOf, valueOf } from '../__tests__/run-issues.ts'
import { parseManifest } from './parse-manifest.ts'

const issuesFor = async (manifest: Record<string, unknown>) => codesOf(await issuesOf(parseManifest(toToml(manifest))))

const withFacets = (facets: Record<string, unknown>) => manifestFixture({ facets: facetsFixture(facets) })

const withExercise = (index: number, exercise: Record<string, unknown>) =>
  manifestFixture({
    exercises: exercisesFixture().map((current, position) =>
      position === index ? { ...current, ...exercise } : current
    ),
  })

describe('parseManifest', () => {
  it('decodes a valid manifest and applies the defaults of schema 1', async () => {
    const manifest = await valueOf(parseManifest(toToml(manifestFixture())))

    expect(manifest.name).toBe('strategy-ts')
    expect(manifest.role).toBe('template')
    expect(manifest.facets.framework).toEqual([])
    expect(manifest.exercises[1]).toMatchObject({ from: 'self', solutionFrom: 'start', hints: ['hint-1.md'] })
    expect(manifest.exercises[0]?.hints).toEqual([])
    expect(manifest.keywords).toEqual([])
  })

  it('decodes the search keywords', async () => {
    const manifest = await valueOf(parseManifest(toToml(manifestFixture({ keywords: ['switch', 'if-else'] }))))

    expect(manifest.keywords).toEqual(['switch', 'if-else'])
  })

  it('accepts a base template', async () => {
    expect(await issuesFor(baseManifestFixture())).toEqual([])
  })

  it('reports invalid TOML with its line', async () => {
    const issues = await issuesOf(parseManifest('schema = 1\nname = "a\n'))

    expect(codesOf(issues)).toEqual(['E_TOML_PARSE typika.toml'])
    expect(issues[0]?.message).toMatch(/^typika\.toml is not valid TOML: .+ \(line 2\)$/)
  })

  it('stops at an unsupported schema version', async () => {
    const issues = await issuesOf(parseManifest(toToml(manifestFixture({ schema: 2, title: 7 }))))

    expect(codesOf(issues)).toEqual(['E_SCHEMA_VERSION_UNSUPPORTED schema'])
    expect(issues[0]?.message).toBe('Manifest schema 2 is not supported. Supported: 1.')
  })

  it('reports missing required fields with their path', async () => {
    const { title: _title, ...withoutTitle } = manifestFixture()
    const issues = await issuesOf(
      parseManifest(toToml({ ...withoutTitle, facets: { language: 'typescript', topic: ['principle/open-closed'] } }))
    )

    expect(codesOf(issues)).toEqual(['E_MISSING_FIELD title', 'E_MISSING_FIELD facets.level'])
    expect(issues[0]?.message).toBe('Missing required field "title".')
  })

  it('rejects unknown keys at every level', async () => {
    const manifest = withExercise(0, { solution: 'x' })
    const issues = await issuesFor({
      ...manifest,
      varaints: {},
      runtime: { kind: 'kotlin', entry: 'Main.kt', target: 'js' },
    })

    expect(issues).toEqual(
      expect.arrayContaining([
        'E_UNKNOWN_FIELD varaints',
        'E_UNKNOWN_FIELD runtime.target',
        'E_UNKNOWN_FIELD exercises[0].solution',
      ])
    )
  })

  it('accepts extension tables at the top level only', async () => {
    expect(await issuesFor(manifestFixture({ 'x-editor': { theme: 'dark' } }))).toEqual([])
    expect(await issuesFor(withFacets({ 'x-editor': {} }))).toEqual(['E_UNKNOWN_FIELD facets.x-editor'])
  })

  it.each([
    [{ name: 'Strategy TS' }, 'name'],
    [{ name: 'ab' }, 'name'],
    [{ title: 'x'.repeat(81) }, 'title'],
    [{ summary: '' }, 'summary'],
    [{ authors: [] }, 'authors'],
    [{ authors: ['maoudin'] }, 'authors[0]'],
    [{ role: 'library' }, 'role'],
    [{ keywords: ['Switch'] }, 'keywords[0]'],
    [{ keywords: ['x'.repeat(33)] }, 'keywords[0]'],
    [{ keywords: Array.from({ length: 11 }, (_, position) => `word-${position}`) }, 'keywords'],
  ])('rejects the invalid top-level value %o', async (override, path) => {
    expect(await issuesFor(manifestFixture(override))).toEqual([`E_INVALID_VALUE ${path}`])
  })

  it.each([
    [{ level: 'expert' }, 'facets.level'],
    [{ topic: [] }, 'facets.topic'],
    [{ topic: ['design-pattern/foo/strategy'] }, 'facets.topic[0]'],
    [{ topic: ['principle/Open-Closed'] }, 'facets.topic[0]'],
    [{ paradigm: ['logic'] }, 'facets.paradigm[0]'],
    [{ useCase: ['mobile'] }, 'facets.useCase[0]'],
    [{ framework: ['Not A Slug'] }, 'facets.framework[0]'],
  ])('rejects the invalid facet %o', async (facets, path) => {
    expect(await issuesFor(withFacets(facets))).toEqual([`E_INVALID_VALUE ${path}`])
  })

  it('formats the reason of an invalid value', async () => {
    const issues = await issuesOf(parseManifest(toToml(withFacets({ level: 'expert' }))))

    expect(issues[0]?.message).toBe(
      'Invalid value for "facets.level": expected "beginner" | "intermediate" | "advanced".'
    )
  })

  it('rejects a license that is not an SPDX identifier', async () => {
    expect(await issuesFor(manifestFixture({ license: 'Apache-2.0' }))).toEqual([])
    expect(await issuesFor(manifestFixture({ license: 'Free' }))).toEqual(['E_LICENSE_INVALID license'])
  })

  it('rejects the node runtime, which schema 1 does not have', async () => {
    expect(await issuesFor(manifestFixture({ runtime: { kind: 'node', entry: 'src/main.ts' } }))).toEqual([
      'E_INVALID_VALUE runtime.kind',
    ])
  })

  it('rejects a runtime that cannot run the language', async () => {
    const manifest = withFacets({ language: 'go' })

    expect(await issuesFor({ ...manifest, commands: {}, variants: {} })).toEqual([
      'E_RUNTIME_LANGUAGE_MISMATCH runtime.kind',
    ])
  })

  it('rejects a test runner that does not belong to the runtime', async () => {
    expect(await issuesFor(manifestFixture({ commands: { test: 'go test' } }))).toEqual([
      'E_INVALID_VALUE commands.test',
    ])
  })

  it.each([['../outside.ts'], ['/src/main.ts'], ['src\\main.ts'], ['']])('rejects the entry path %j', async (entry) => {
    expect(await issuesFor(manifestFixture({ runtime: { kind: 'browser-js', entry } }))).toEqual([
      'E_INVALID_VALUE runtime.entry',
    ])
  })

  it('rejects tour steps outside tour/ and tours longer than 12 steps', async () => {
    expect(await issuesFor(manifestFixture({ tour: { steps: ['docs/01.md'] } }))).toEqual([
      'E_INVALID_VALUE tour.steps[0]',
    ])
    const steps = Array.from({ length: 13 }, (_, index) => `tour/${index}.md`)
    expect(await issuesFor(manifestFixture({ tour: { steps } }))).toEqual(['E_INVALID_VALUE tour.steps'])
  })

  it('rejects malformed template references', async () => {
    const manifest = manifestFixture({
      parent: 'github:someone',
      base: { template: 'typika/templates/strategy-base/ts' },
      variants: { go: 'github:typika/templates/../go' },
    })

    expect(await issuesFor(manifest)).toEqual([
      'E_INVALID_REF parent',
      'E_INVALID_REF base.template',
      'E_INVALID_REF variants.go',
    ])
  })

  it('rejects a variant in the template own language and unknown variant languages', async () => {
    const variants = {
      typescript: 'github:typika/templates/strategy/ts',
      rust: 'github:typika/templates/strategy/rust',
    }

    expect(await issuesFor(manifestFixture({ variants }))).toEqual([
      'E_UNKNOWN_FIELD variants.rust',
      'E_VARIANT_SELF variants.typescript',
    ])
  })

  it('rejects duplicate exercise names', async () => {
    expect(await issuesFor(withExercise(1, { name: 'add-pickup-point-option' }))).toEqual([
      'E_EXERCISE_DUPLICATE_NAME exercises[1].name',
    ])
  })

  it('rejects an exercise that starts from a missing base', async () => {
    const { base: _base, ...withoutBase } = manifestFixture()

    expect(await issuesFor(withoutBase)).toEqual(['E_EXERCISE_FROM_BASE_WITHOUT_BASE exercises[0].from'])
  })

  it('rejects solutionFrom = "self" on an exercise that starts from itself', async () => {
    expect(await issuesFor(withExercise(1, { solutionFrom: 'self' }))).toEqual([
      'E_EXERCISE_SOLUTION_FROM_SELF exercises[1].solutionFrom',
    ])
  })

  it.each([
    [{ kind: 'quiz' }, 'exercises[1].kind'],
    [{ failing: [] }, 'exercises[1].failing'],
    [{ level: 'expert' }, 'exercises[1].level'],
    [{ name: 'Implement' }, 'exercises[1].name'],
  ])('rejects the invalid exercise field %o', async (exercise, path) => {
    expect(await issuesFor(withExercise(1, exercise))).toEqual([`E_INVALID_VALUE ${path}`])
  })

  it('rejects tour, base and variants on a base template', async () => {
    const manifest = baseManifestFixture({
      tour: { steps: ['tour/01-overview.md'] },
      variants: { go: 'github:typika/templates/strategy-base/go' },
    })

    expect(await issuesFor(manifest)).toEqual(['E_BASE_FORBIDDEN_FIELD variants', 'E_BASE_FORBIDDEN_FIELD tour'])
  })

  it('reports every issue of a manifest at once', async () => {
    const manifest = manifestFixture({ name: 'X', license: 'Free', varaints: {} })

    expect(await issuesFor(manifest)).toEqual([
      'E_UNKNOWN_FIELD varaints',
      'E_INVALID_VALUE name',
      'E_LICENSE_INVALID license',
    ])
  })
})
