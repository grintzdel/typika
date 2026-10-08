import { describe, expect, it } from 'vitest'

import { codesOf, issuesOf, valueOf } from '../__tests__/run-issues.ts'
import { parseTourStep } from './parse-tour-step.ts'

const PATH = 'tour/04-context.md'

const stepSource = (frontMatter: string, body = 'The context delegates.\n') => `+++\n${frontMatter}\n+++\n\n${body}`

const reasonsFor = async (frontMatter: string) =>
  (await issuesOf(parseTourStep(PATH, stepSource(frontMatter)))).map((issue) => issue.message)

describe('parseTourStep', () => {
  it('parses the front-matter and keeps the Markdown body', async () => {
    const source = stepSource(
      'id = "context"\ntitle = "The context delegates"\nfile = "src/checkout/shipping-quote.ts"\nlines = "12-27"\nalso = ["src/checkout/shipping-cost.ts"]'
    )

    expect(await valueOf(parseTourStep(PATH, source))).toEqual({
      path: PATH,
      id: 'context',
      title: 'The context delegates',
      file: 'src/checkout/shipping-quote.ts',
      lines: { start: 12, end: 27 },
      also: ['src/checkout/shipping-cost.ts'],
      body: 'The context delegates.\n',
    })
  })

  it('parses a text-only step and a step anchored on a region', async () => {
    expect(await valueOf(parseTourStep(PATH, stepSource('id = "overview"\ntitle = "Overview"')))).toEqual({
      path: PATH,
      id: 'overview',
      title: 'Overview',
      also: [],
      body: 'The context delegates.\n',
    })
    const regionStep = await valueOf(
      parseTourStep(PATH, stepSource('id = "context"\ntitle = "Context"\nfile = "src/a.ts"\nregion = "context"'))
    )
    expect(regionStep.region).toBe('context')
  })

  it('accepts Windows line endings', async () => {
    const source = '+++\r\nid = "overview"\r\ntitle = "Overview"\r\n+++\r\nBody\r\n'

    expect((await valueOf(parseTourStep(PATH, source))).id).toBe('overview')
  })

  it('reports a step without front-matter', async () => {
    const issues = await issuesOf(parseTourStep(PATH, '# Overview\n'))

    expect(codesOf(issues)).toEqual([`E_TOUR_FRONTMATTER ${PATH}`])
    expect(issues[0]?.message).toBe(`Tour step "${PATH}": missing front-matter delimited by +++.`)
  })

  it('reports invalid TOML in the front-matter', async () => {
    expect(await reasonsFor('id = "context')).toEqual([
      expect.stringMatching(new RegExp(`^Tour step "${PATH}": invalid TOML: .+\\.$`)),
    ])
  })

  it.each([
    ['title = "Context"', 'missing field "id"'],
    ['id = "Context"\ntitle = "Context"', 'invalid value for "id"'],
    ['id = "context"\ntitle = ""', 'invalid value for "title"'],
    [`id = "context"\ntitle = "${'x'.repeat(61)}"`, 'invalid value for "title"'],
    ['id = "context"\ntitle = "Context"\nfiles = "a.ts"', 'unknown field "files"'],
    ['id = "context"\ntitle = "Context"\nlines = "1-3"', '"lines" requires "file"'],
    ['id = "context"\ntitle = "Context"\nregion = "context"', '"region" requires "file"'],
    [
      'id = "context"\ntitle = "Context"\nfile = "a.ts"\nlines = "1"\nregion = "r"',
      '"lines" and "region" are exclusive',
    ],
    ['id = "context"\ntitle = "Context"\nfile = "a.ts"\nlines = "5-3"', 'invalid value for "lines"'],
    ['id = "context"\ntitle = "Context"\nfile = "a.ts"\nlines = "0-3"', 'invalid value for "lines"'],
    ['id = "context"\ntitle = "Context"\nfile = "a.ts"\nlines = "1-41"', 'invalid value for "lines"'],
    ['id = "context"\ntitle = "Context"\nfile = "a.ts"\nlines = "L1-L3"', 'invalid value for "lines"'],
    ['id = "context"\ntitle = "Context"\nfile = "../a.ts"', 'invalid value for "file"'],
  ])('rejects the front-matter %j', async (frontMatter, reason) => {
    const reasons = await reasonsFor(frontMatter)

    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain(reason)
  })
})
