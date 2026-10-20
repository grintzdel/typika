import type { TemplateFiles } from '@typika/manifest'
import type { TemplateRunner, TestRun } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { indexOf, indexTemplate } from '../__tests__/index-template.factory.ts'
import { manifestToml } from '../__tests__/manifest.factory.ts'
import { makeFakeSource } from '../__tests__/template-source.fake.ts'
import { validateProject, type ValidateOptions } from './validate-project.ts'

const TS_REF = 'github:typika/templates/strategy/ts@1318eae7665d'

const tour = (...ids: ReadonlyArray<string>) =>
  ids.map(
    (id, index) => [`tour/0${index + 1}-${id}.md`, `+++\nid = "${id}"\ntitle = "${id}"\n+++\n\n${id}.\n`] as const
  )

const tourToml = (ids: ReadonlyArray<string>) =>
  `\n[tour]\nsteps = [${ids.map((id, index) => `"tour/0${index + 1}-${id}.md"`).join(', ')}]\n`

const goProject = (extra = '', files: ReadonlyArray<readonly [string, string]> = []): TemplateFiles =>
  new Map([
    ['typika.toml', manifestToml({ name: 'strategy-go', language: 'go', kind: 'go', entry: 'main.go', extra })],
    ['LICENSE', 'MIT-0'],
    ['README.md', '# Strategy\n'],
    ['main.go', 'package main\n'],
    ...files,
  ])

const passing = (file = 'main_test.go'): TestRun => ({ _tag: 'Tested', tests: [{ file, status: 'passed' }] })

const runnerOf =
  (run: TestRun): ValidateOptions['runnerOf'] =>
  () =>
    ({ runTests: () => Effect.succeed(run) }) satisfies TemplateRunner

const validate = (options: Partial<ValidateOptions> & { readonly files: TemplateFiles }) =>
  Effect.runPromise(
    validateProject({
      index: indexOf([]),
      source: makeFakeSource(indexOf([]), {}),
      run: false,
      runnerOf: () => undefined,
      ...options,
    })
  )

describe('validateProject', () => {
  it('reports no issue for a valid template', async () => {
    const report = await validate({ files: goProject() })

    expect(report).toEqual({ name: 'strategy-go', issues: [], notes: [] })
  })

  it('reports the manifest errors of a broken template', async () => {
    const report = await validate({ files: new Map([...goProject()].filter(([path]) => path !== 'LICENSE')) })

    expect(report.issues.map((issue) => issue.code)).toEqual(['E_LICENSE_FILE_MISSING'])
  })

  it('warns about a topic absent from the registry vocabulary', async () => {
    const files = new Map(goProject())
    files.set('typika.toml', String(files.get('typika.toml')).replace('behavioral/strategy', 'behavioral/unknown'))

    const report = await validate({ files })

    expect(report.issues.map((issue) => issue.code)).toEqual(['W_UNKNOWN_TOPIC'])
  })

  it('compares the tour order with the TypeScript variant pinned in the index', async () => {
    const reference = new Map([
      ['typika.toml', manifestToml({ extra: tourToml(['overview', 'problem', 'trade-offs']) })],
      ['LICENSE', 'MIT-0'],
      ['README.md', '# Strategy\n'],
      ['src/main.ts', 'main()\n'],
      ...tour('overview', 'problem', 'trade-offs'),
    ])
    const index = indexOf([indexTemplate('strategy-ts', { ref: TS_REF })])
    const files = goProject(
      `${tourToml(['problem', 'overview', 'trade-offs'])}\n[variants]\ntypescript = "github:typika/templates/strategy/ts"\n`,
      tour('problem', 'overview', 'trade-offs')
    )

    const report = await validate({ files, index, source: makeFakeSource(index, { [TS_REF]: reference }) })

    expect(report.issues.map((issue) => issue.code)).toEqual(['W_TOUR_ORDER_DIVERGES'])
  })

  it('notes that the tour order was not compared when the TypeScript variant is not reachable', async () => {
    const files = goProject('\n[variants]\ntypescript = "github:typika/templates/strategy/ts"\n')

    const report = await validate({ files })

    expect(report.notes).toEqual([
      'The TypeScript variant github:typika/templates/strategy/ts is not reachable: the tour order was not compared.',
    ])
  })

  it('does not run the tests without --run', async () => {
    const report = await validate({
      files: goProject(),
      runnerOf: runnerOf({ _tag: 'BuildFailed', message: 'syntax error' }),
    })

    expect(report.issues).toEqual([])
  })

  it('reports failing template tests with --run', async () => {
    const report = await validate({
      files: goProject(),
      run: true,
      runnerOf: runnerOf({ _tag: 'Tested', tests: [{ file: 'quote_test.go', status: 'failed' }] }),
    })

    expect(report.issues).toEqual([
      {
        code: 'E_TESTS_FAIL',
        path: 'tests',
        message: 'The tests of the template do not pass (failing in quote_test.go).',
      },
    ])
  })

  it('passes with --run when the template tests pass', async () => {
    const report = await validate({ files: goProject(), run: true, runnerOf: runnerOf(passing()) })

    expect(report.issues).toEqual([])
  })

  it('notes that nothing ran when no runner exists for the runtime', async () => {
    const report = await validate({ files: goProject(), run: true })

    expect(report.notes).toEqual(['No go runner: the tests and exercises were not run.'])
  })
})
