import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import type { TemplateFiles } from '@typika/manifest'
import { readTemplates, inProcessRunners, type TemplateCheck, type TemplateSet } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import { officialEntry, TEMPLATES_ROOT, VOCABULARY } from '../__tests__/registry.factory.ts'
import { RefUnresolvableError } from '../domain/errors/ref-unresolvable.error.ts'
import type { RegistrySource } from '../read-registry/read-registry.ts'
import type { ResolveRef } from '../resolve-ref/resolve-ref.ts'
import { checkRegistry } from './check-registry.ts'

let templates: TemplateSet

beforeAll(async () => {
  templates = await readTemplates(TEMPLATES_ROOT, async (root) =>
    execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter((path) => path !== '')
      .map((path) => join(root, path))
  )
})

const resolveFrom =
  (set: TemplateSet): ResolveRef =>
  ({ path }) => {
    const files = path === undefined ? undefined : set.get(path)
    return files === undefined
      ? Effect.fail(new RefUnresolvableError({ reason: 'no template' }))
      : Effect.succeed(files)
  }

const withFile = (dir: string, path: string, edit: (content: string) => string | Uint8Array): TemplateSet => {
  const files: TemplateFiles = templates.get(dir) ?? new Map()
  const content = files.get(path)
  return new Map([...templates, [dir, new Map([...files, [path, edit(typeof content === 'string' ? content : '')]])]])
}

const STRATEGY = [
  officialEntry('strategy-ts', 'strategy/ts'),
  officialEntry('strategy-base-ts', 'strategy-base/ts'),
  ...['go', 'kotlin'].flatMap((language) => [
    officialEntry(`strategy-${language}`, `strategy/${language}`),
    officialEntry(`strategy-base-${language}`, `strategy-base/${language}`),
  ]),
] as const

const check = async (entries: RegistrySource['entries'], set: TemplateSet = templates, vocabulary = VOCABULARY) => {
  const report = await Effect.runPromise(checkRegistry({ entries, vocabulary }, resolveFrom(set), inProcessRunners))
  return report
}

const codesOf = (checks: ReadonlyArray<TemplateCheck>, file: string) =>
  checks.find((candidate) => candidate.dir === file)?.issues.map((issue) => issue.code) ?? []

describe('checkRegistry', () => {
  it('returns the manifest and tour of each registered template', async () => {
    const report = await check(STRATEGY)

    expect(report.checks.flatMap((entry) => entry.issues)).toEqual([])
    expect(report.templates.map((template) => template.manifest.name)).toEqual([
      'strategy-ts',
      'strategy-base-ts',
      'strategy-go',
      'strategy-base-go',
      'strategy-kotlin',
      'strategy-base-kotlin',
    ])
    expect(report.templates[0]?.tourSteps.map((step) => step.id)).toContain('trade-offs')
  })

  it('refuses a ref that is not pinned to a commit', async () => {
    const report = await check([
      { file: 'templates/official/strategy-ts.toml', source: 'ref = "github:typika/templates/strategy/ts@main"\n' },
    ])

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toContain('E_MISSING_FIELD')
    const pinned = await check([
      officialEntry('strategy-ts', 'strategy/ts', { ref: 'github:typika/templates/strategy/ts@main' }),
    ])
    expect(codesOf(pinned.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_REF_NOT_PINNED'])
  })

  it('refuses an entry file named after another template', async () => {
    const report = await check([officialEntry('strategy', 'strategy/ts'), ...STRATEGY.slice(1)])

    expect(codesOf(report.checks, 'templates/official/strategy.toml')).toEqual(['E_ENTRY_NAME_MISMATCH'])
  })

  it('refuses the same name in both categories', async () => {
    const community = officialEntry('strategy-ts', 'strategy/ts', { category: 'community' })
    const report = await check([...STRATEGY, community])

    expect(codesOf(report.checks, 'templates/community/strategy-ts.toml')).toEqual([])
    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_NAME_TAKEN'])
  })

  it('refuses an entry whose category is not its folder', async () => {
    const report = await check([
      { file: 'templates/community/strategy-ts.toml', source: STRATEGY[0].source },
      ...STRATEGY.slice(1),
    ])

    expect(codesOf(report.checks, 'templates/community/strategy-ts.toml')).toEqual(['E_INVALID_VALUE'])
  })

  it('refuses an official template hosted outside typika', async () => {
    const report = await check([
      officialEntry('strategy-ts', 'strategy/ts', { ref: 'github:someone/templates/strategy/ts@0123456789ab' }),
    ])

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_CATEGORY_MISMATCH'])
  })

  it('refuses a ref it cannot resolve', async () => {
    const report = await check([officialEntry('observer-ts', 'observer/rust')])

    expect(codesOf(report.checks, 'templates/official/observer-ts.toml')).toEqual(['E_REF_UNRESOLVABLE'])
  })

  it('refuses a base that is not in the registry', async () => {
    const report = await check([STRATEGY[0]])

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toContain('E_REF_UNRESOLVABLE')
  })

  it('refuses a topic outside the vocabulary', async () => {
    const report = await check(STRATEGY, templates, VOCABULARY.replace('principle/open-closed', 'principle/other'))

    expect(report.checks.find((entry) => entry.dir.endsWith('strategy-ts.toml'))?.issues).toContainEqual({
      code: 'E_INVALID_VALUE',
      path: 'facets.topic[1]',
      message: 'Invalid value for "facets.topic[1]": "principle/open-closed" is not in the registry vocabulary.',
    })
  })

  it('refuses a design pattern without a refactor exercise', async () => {
    const report = await check(
      [
        officialEntry('factory-method-ts', 'factory-method/ts'),
        officialEntry('factory-method-base-ts', 'factory-method-base/ts'),
      ],
      withFile('factory-method/ts', 'typika.toml', (toml) => toml.replace('kind = "refactor"', 'kind = "fix"'))
    )

    expect(codesOf(report.checks, 'templates/official/factory-method-ts.toml')).toEqual(['E_REFACTOR_EXERCISE_MISSING'])
  })

  it('refuses an official template that is not MIT-0', async () => {
    const report = await check(
      STRATEGY,
      withFile('strategy/ts', 'typika.toml', (toml) => toml.replace('license = "MIT-0"', 'license = "Apache-2.0"'))
    )

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_LICENSE_NOT_MIT0'])
  })

  it('refuses an official tour that does not end with trade-offs', async () => {
    const report = await check(
      STRATEGY,
      withFile('strategy/ts', 'tour/06-trade-offs.md', (step) => step.replace('id = "trade-offs"', 'id = "limits"'))
    )

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_TOUR_REQUIRED_STEP'])
  })

  it('refuses a parent that is not in the registry', async () => {
    const remix = officialEntry('strategy-ts', 'strategy/ts', {
      extra: 'parent = "github:typika/templates/observer/ts@0123456789ab"\n',
    })
    const report = await check([remix, ...STRATEGY.slice(1)])

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_REF_UNRESOLVABLE'])
  })

  it('turns a size warning into an error', async () => {
    const report = await check(
      STRATEGY,
      withFile('strategy/ts', 'tour/diagram.bin', () => new Uint8Array([0]))
    )

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_SIZE'])
  })

  it('fails an exercise whose solution is broken', async () => {
    const report = await check(
      STRATEGY,
      withFile('strategy/ts', 'exercises/implement-express/solution/src/checkout/options/express.ts', (code) =>
        code.replace('1290', '1300')
      )
    )

    expect(codesOf(report.checks, 'templates/official/strategy-ts.toml')).toEqual(['E_EXERCISE_SOLUTION_FAILS'])
  })

  it('reports an invalid vocabulary', async () => {
    const report = await check(STRATEGY, templates, 'topics = 3\n')

    expect(codesOf(report.checks, 'vocabulary.toml')).toEqual(['E_INVALID_VALUE'])
  })
})
