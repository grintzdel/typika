import { describe, expect, it } from 'vitest'

import { countProblems, problemsOf, type Problem } from './problems.domain-model.ts'

const CONTENT = 'package main\n\nfunc main() {\n\tfmt.Println("hi")\n}\n'

const problem = (overrides: Partial<Problem> = {}): Problem => ({
  path: 'src/main.ts',
  line: 1,
  column: 1,
  from: 0,
  to: 1,
  severity: 'error',
  message: 'Broken.',
  ...overrides,
})

describe('problemsOf', () => {
  it('places a build diagnostic at its line and column in the file', () => {
    const problems = problemsOf({
      analysed: [],
      build: [{ severity: 'error', message: 'undefined: fmt', location: { file: 'main.go', line: 4, column: 2 } }],
      contentOf: () => CONTENT,
    })

    const from = CONTENT.indexOf('fmt')
    expect(problems).toEqual([
      { path: 'main.go', line: 4, column: 2, from, to: from, severity: 'error', message: 'undefined: fmt' },
    ])
  })

  it('keeps a build diagnostic without a column at the start of its line', () => {
    const [found] = problemsOf({
      analysed: [],
      build: [{ severity: 'warning', message: 'unused', location: { file: 'main.go', line: 3 } }],
      contentOf: () => CONTENT,
    })

    expect(found).toMatchObject({ line: 3, column: 1, from: CONTENT.indexOf('func') })
  })

  it('leaves out the build diagnostics that point at no file', () => {
    expect(
      problemsOf({ analysed: [], build: [{ severity: 'error', message: 'link failed' }], contentOf: () => '' })
    ).toEqual([])
  })

  it('reports a problem found both live and by the build once', () => {
    const live = problem({ path: 'src/main.ts', line: 2, column: 5 })

    const problems = problemsOf({
      analysed: [live],
      build: [{ severity: 'error', message: 'Broken.', location: { file: 'src/main.ts', line: 2, column: 5 } }],
      contentOf: () => 'a\nbcdefgh\n',
    })

    expect(problems).toEqual([live])
  })

  it('sorts the problems by file, line and column', () => {
    const problems = problemsOf({
      analysed: [
        problem({ path: 'src/b.ts', line: 1 }),
        problem({ path: 'src/a.ts', line: 3, column: 9 }),
        problem({ path: 'src/a.ts', line: 3, column: 2 }),
      ],
      build: [],
      contentOf: () => '',
    })

    expect(problems.map(({ path, line, column }) => `${path}:${line}:${column}`)).toEqual([
      'src/a.ts:3:2',
      'src/a.ts:3:9',
      'src/b.ts:1:1',
    ])
  })
})

describe('countProblems', () => {
  it('counts the errors and the warnings', () => {
    expect(
      countProblems([problem(), problem({ severity: 'warning' }), problem({ severity: 'info' }), problem()])
    ).toEqual({ errors: 2, warnings: 1 })
  })
})
