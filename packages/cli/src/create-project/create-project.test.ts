import type { TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { indexOf, indexTemplate } from '../__tests__/index-template.factory.ts'
import { manifestToml } from '../__tests__/manifest.factory.ts'
import { makeFakeSource } from '../__tests__/template-source.fake.ts'
import { createProject, type CreateOptions } from './create-project.ts'

const TS_REF = 'github:typika/templates/strategy/ts@1318eae7665d'
const GO_REF = 'github:typika/templates/strategy/go@8203d3dae8a4'
const BASE_REF = 'github:typika/templates/strategy-base/ts@0a0b218aaaaa'

const project = (manifest: string, extra: ReadonlyArray<readonly [string, string]> = []): TemplateFiles =>
  new Map([
    ['typika.toml', manifest],
    ['LICENSE', 'MIT-0'],
    ['README.md', '# Strategy\n'],
    ['src/main.ts', 'main()\n'],
    ...extra,
  ])

const strategyTs = project(
  manifestToml({
    extra: `
[base]
template = "github:typika/templates/strategy-base/ts"

[variants]
go = "github:typika/templates/strategy/go"

[[exercises]]
name = "add-pickup-point"
kind = "refactor"
title = "Add a pickup point"
from = "base"
solutionFrom = "self"
failing = ["tests/pickup.test.ts"]
`,
  }),
  [
    ['tour/01-overview.md', '# Overview'],
    ['exercises/add-pickup-point/README.md', 'Add a pickup point.\n'],
    ['exercises/add-pickup-point/start/tests/pickup.test.ts', 'pickup()\n'],
    ['exercises/add-pickup-point/solution/src/pickup.ts', 'solved()\n'],
  ]
)

const strategyGo = new Map([
  ['typika.toml', manifestToml({ name: 'strategy-go', language: 'go', kind: 'go', entry: 'main.go' })],
  ['LICENSE', 'MIT-0'],
  ['README.md', '# Strategy\n'],
  ['main.go', 'package main\n'],
])

const strategyBase = new Map([
  ['typika.toml', manifestToml({ name: 'strategy-base-ts', extra: '' }).replace('authors', 'role = "base"\nauthors')],
  ['LICENSE', 'MIT-0'],
  ['README.md', '# Base\n'],
  ['src/main.ts', 'ifElse()\n'],
])

const index = indexOf([
  indexTemplate('strategy-ts', { ref: TS_REF }),
  indexTemplate('strategy-go', { ref: GO_REF }),
  indexTemplate('strategy-base-ts', { ref: BASE_REF }),
  indexTemplate('observer-ts', {
    ref: 'github:typika/templates/observer/ts@aaaaaaaaaaaa',
    health: {
      status: 'deprecated',
      checkedAt: '2026-10-20',
      brokenSince: null,
      checks: { boot: 'pass', tests: 'pass', exercises: 'pass', deps: 'pass' },
      runUrl: null,
    },
  }),
])

const sourceOf = (templates: Readonly<Record<string, TemplateFiles>> = {}) =>
  makeFakeSource(index, {
    [TS_REF]: strategyTs,
    [GO_REF]: strategyGo,
    [BASE_REF]: strategyBase,
    'github:typika/templates/observer/ts@aaaaaaaaaaaa': project(manifestToml({ name: 'observer-ts' })),
    ...templates,
  })

const run = (options: Partial<CreateOptions> & { readonly template: string }, source = sourceOf()) =>
  Effect.runPromise(Effect.result(createProject(source, { keepTour: false, ...options })))

describe('createProject', () => {
  it('creates the project of a registry name at its pinned ref, without the Typika files', async () => {
    const result = await run({ template: 'strategy-ts' })

    expect(result._tag).toBe('Success')
    if (result._tag !== 'Success') return
    expect(result.success.ref).toBe(TS_REF)
    expect(result.success.warnings).toEqual([])
    expect([...result.success.files.keys()].toSorted()).toEqual(['LICENSE', 'README.md', 'src/main.ts'])
  })

  it('fails with TemplateNotFoundError on a name absent from the index', async () => {
    const result = await run({ template: 'missing-ts' })

    expect(result._tag === 'Failure' && result.failure._tag).toBe('TemplateNotFoundError')
  })

  it('switches to the variant pinned in the index without downloading the template first', async () => {
    const source = sourceOf()

    const result = await run({ template: 'strategy-ts', variant: 'go' }, source)

    expect(result._tag === 'Success' && result.success.manifest.name).toBe('strategy-go')
    expect(source.requested).toEqual([TS_REF, GO_REF])
  })

  it('fails with VariantNotFoundError when the template has no variant in that language', async () => {
    const result = await run({ template: 'strategy-ts', variant: 'kotlin' })

    expect(result._tag === 'Failure' && result.failure._tag).toBe('VariantNotFoundError')
  })

  it('fails with ExerciseNotFoundError on an unknown exercise', async () => {
    const result = await run({ template: 'strategy-ts', exercise: 'missing' })

    expect(result._tag === 'Failure' && result.failure._tag).toBe('ExerciseNotFoundError')
  })

  it('starts an exercise from its base, pinned through the index', async () => {
    const result = await run({ template: 'strategy-ts', exercise: 'add-pickup-point' })

    expect(result._tag === 'Success' && result.success.files).toEqual(
      new Map([
        ['LICENSE', 'MIT-0'],
        ['README.md', '# Base\n'],
        ['src/main.ts', 'ifElse()\n'],
        ['tests/pickup.test.ts', 'pickup()\n'],
        ['EXERCISE.md', 'Add a pickup point.\n'],
      ])
    )
  })

  it('fails with ManifestInvalidError when the manifest declares an unsupported schema', async () => {
    const source = sourceOf({ [TS_REF]: project(manifestToml().replace('schema = 1', 'schema = 99')) })

    const result = await run({ template: 'strategy-ts' }, source)

    expect(result._tag === 'Failure' && result.failure._tag).toBe('ManifestInvalidError')
  })

  it('takes a github: ref without reading the index and warns that it is not pinned', async () => {
    const ref = 'github:someone/patterns/strategy'
    const source = makeFakeSource(undefined, { [ref]: strategyGo })

    const result = await run({ template: ref }, source)

    expect(result._tag === 'Success' && result.success.warnings).toEqual([
      `${ref} is not pinned on a commit SHA: its content can change.`,
    ])
  })

  it('warns that a deprecated template is deprecated and still creates it', async () => {
    const result = await run({ template: 'observer-ts' })

    expect(result._tag === 'Success' && result.success.warnings).toEqual(['observer-ts is deprecated.'])
  })
})
