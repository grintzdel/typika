import { describe, expect, it } from 'vitest'

import { collectTypeScriptLibraries } from '../../../../../../vite/typescript-libraries.ts'
import type { LanguageServiceFiles } from '../../domain/language-service.domain-model.ts'
import { makeTypeScriptProject } from './typescript-project.ts'

const libraries = collectTypeScriptLibraries()

const MONEY = `export type Money = { readonly cents: number }

/** Builds an amount from cents. */
export const money = (cents: number): Money => ({ cents })

export const addMoney = (a: Money, b: Money): Money => money(a.cents + b.cents)
`

const MAIN = `import { money } from './money.ts'

console.log(money(100))
`

const TEST = `import { describe, expect, it } from 'vitest'
import { money } from '../src/money.ts'

describe('money', () => {
  it('keeps the cents', () => {
    expect(money(1).cents).toBe(1)
  })
})
`

const FILES: LanguageServiceFiles = {
  'package.json': JSON.stringify({ type: 'module' }),
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'es2022',
      module: 'nodenext',
      strict: true,
      noEmit: true,
      allowImportingTsExtensions: true,
    },
  }),
  'src/money.ts': MONEY,
  'src/main.ts': MAIN,
  'tests/money.test.ts': TEST,
  'exercises/split/solution/src/split.ts': 'export const splitMoney = (total: number) => [total]\n',
}

const makeProject = (files: LanguageServiceFiles = FILES) => makeTypeScriptProject({ libraries, files })

const append = (text: string, suffix: string) => ({ content: `${text}${suffix}`, end: text.length + suffix.length })

describe('makeTypeScriptProject', () => {
  it('reports no diagnostic on a valid project, tests included', () => {
    const project = makeProject()

    expect(project.diagnostics('src/main.ts')).toEqual([])
    expect(project.diagnostics('tests/money.test.ts')).toEqual([])
  })

  it('reports a type error with its range', () => {
    const project = makeProject()
    const { content } = append(MAIN, "const total: number = 'free'\n")
    project.updateFile('src/main.ts', content)

    expect(project.diagnostics('src/main.ts')).toEqual([
      {
        from: content.indexOf('total'),
        to: content.indexOf('total') + 'total'.length,
        severity: 'error',
        message: "Type 'string' is not assignable to type 'number'.",
      },
    ])
  })

  it('reports an import broken by an edit in another file', () => {
    const project = makeProject()

    project.updateFile('src/money.ts', MONEY.replace('export const money', 'export const makeMoney'))

    expect(project.diagnostics('src/main.ts').map((diagnostic) => diagnostic.message)).toEqual([
      expect.stringContaining("has no exported member named 'money'"),
    ])
  })

  it('does not know the DOM', () => {
    const project = makeProject()
    project.updateFile('src/main.ts', 'document.title = "x"\n')

    expect(project.diagnostics('src/main.ts').map((diagnostic) => diagnostic.message)).toEqual([
      expect.stringContaining("Cannot find name 'document'."),
    ])
  })

  it('completes the members of a value', () => {
    const project = makeProject()
    const { content, end } = append(MAIN, 'money(1).')
    project.updateFile('src/main.ts', content)

    const completions = project.completions('src/main.ts', end)

    expect(completions?.from).toBe(end)
    expect(completions?.items.map((item) => item.label)).toEqual(['cents'])
  })

  it('completes an export of another file', () => {
    const project = makeProject()
    const { content, end } = append(MAIN, 'a')
    project.updateFile('src/main.ts', content)

    const completions = project.completions('src/main.ts', end)

    expect(completions?.from).toBe(end - 'a'.length)
    expect(completions?.items.find((item) => item.label === 'addMoney')).toMatchObject({
      source: './money.ts',
      hasAction: true,
    })
  })

  it('imports a completed export once its name is in the file', () => {
    const project = makeProject()
    const typed = append(MAIN, 'a')
    project.updateFile('src/main.ts', typed.content)
    const addMoney = project.completions('src/main.ts', typed.end)?.items.find((item) => item.label === 'addMoney')
    const accepted = append(MAIN, 'addMoney')
    project.updateFile('src/main.ts', accepted.content)

    expect(addMoney === undefined ? [] : project.completionChanges('src/main.ts', accepted.end, addMoney)).toEqual([
      { from: 'import { '.length, to: 'import { '.length, insert: 'addMoney, ' },
    ])
  })

  it('describes a completion with its signature and its documentation', () => {
    const project = makeProject()
    const { content, end } = append(MAIN, 'mon')
    project.updateFile('src/main.ts', content)
    const item = project.completions('src/main.ts', end)?.items.find((found) => found.label === 'money')

    expect(item === undefined ? undefined : project.completionDetails('src/main.ts', end, item)).toEqual({
      signature: '(alias) const money: (cents: number) => Money\nimport money',
      documentation: 'Builds an amount from cents.',
    })
  })

  it('completes the path of a relative import from the start of the typed segment', () => {
    const project = makeProject()
    const content = `import { money } from './mo'\n`
    const end = content.indexOf("mo'") + 'mo'.length
    project.updateFile('src/main.ts', content)

    const completions = project.completions('src/main.ts', end)

    expect(completions?.from).toBe(end - 'mo'.length)
    expect(completions?.items.map((item) => item.label)).toContain('money.ts')
  })

  it('lists the problems of every project file with their line and column', () => {
    const project = makeProject()
    const { content } = append(MAIN, "const total: number = 'free'\n")
    project.updateFile('src/main.ts', content)
    project.updateFile('exercises/split/solution/src/split.ts', 'const broken: number = "x"\n')

    expect(project.projectDiagnostics()).toEqual([
      {
        path: 'src/main.ts',
        line: 4,
        column: 7,
        from: content.indexOf('total'),
        to: content.indexOf('total') + 'total'.length,
        severity: 'error',
        message: "Type 'string' is not assignable to type 'number'.",
      },
    ])
  })

  it('describes the symbol under the cursor', () => {
    const project = makeProject()
    const position = MAIN.lastIndexOf('money')

    expect(project.quickInfo('src/main.ts', position)).toEqual({
      from: position,
      to: position + 'money'.length,
      signature: '(alias) money(cents: number): Money\nimport money',
      documentation: 'Builds an amount from cents.',
    })
  })

  it('describes the parameters of the function being called', () => {
    const project = makeProject()
    const { content, end } = append(MAIN, 'money(')
    project.updateFile('src/main.ts', content)

    expect(project.signatureHelp('src/main.ts', end)).toEqual({
      prefix: 'money(',
      parameters: ['cents: number'],
      separator: ', ',
      suffix: '): Money',
      activeParameter: 0,
      documentation: 'Builds an amount from cents.',
    })
  })

  it('has no signature outside of a call', () => {
    expect(makeProject().signatureHelp('src/main.ts', 0)).toBeUndefined()
  })

  it('leaves the exercise overlays out of the project', () => {
    const project = makeProject()
    const { content, end } = append(MAIN, 'splitMon')
    project.updateFile('src/main.ts', content)

    expect(project.completions('src/main.ts', end)?.items.map((item) => item.label)).not.toContain('splitMoney')
    expect(project.diagnostics('exercises/split/solution/src/split.ts')).toEqual([])
  })

  it('replaces every file, forgetting the ones that are gone', () => {
    const project = makeProject()
    const { 'src/money.ts': _removed, ...withoutMoney } = FILES

    project.setFiles(withoutMoney)

    expect(project.diagnostics('src/main.ts').map((diagnostic) => diagnostic.message)).toEqual([
      expect.stringContaining("Cannot find module './money.ts'"),
    ])
  })

  it('follows a file moved to a new path', () => {
    const project = makeProject()

    project.updateFile('src/cash.ts', MONEY)
    project.removeFile('src/money.ts')

    expect(project.diagnostics('src/main.ts').map((diagnostic) => diagnostic.message)).toEqual([
      expect.stringContaining("Cannot find module './money.ts'"),
    ])
    project.updateFile('src/main.ts', MAIN.replace('./money.ts', './cash.ts'))
    expect(project.diagnostics('src/main.ts')).toEqual([])
    expect(project.diagnostics('src/money.ts')).toEqual([])
  })

  it('ignores the removal of a file it does not know', () => {
    const project = makeProject()

    project.removeFile('src/unknown.ts')

    expect(project.diagnostics('src/main.ts')).toEqual([])
  })

  it('analyses a JavaScript project without a tsconfig', () => {
    const project = makeProject({
      'package.json': JSON.stringify({ type: 'module' }),
      'src/money.js': 'export const money = (cents) => ({ cents })\n',
      'src/main.js': "import { money } from './money.js'\n\nconsole.log(money(100).cents)\n",
    })
    const { content, end } = append("import { money } from './money.js'\n", 'money(1).ce')
    project.updateFile('src/main.js', content)

    expect(project.diagnostics('src/money.js')).toEqual([])
    expect(project.completions('src/main.js', end)?.items.map((item) => item.label)).toContain('cents')
  })

  it('finds the declaration of an imported symbol in its own file', () => {
    const project = makeProject()

    expect(project.definition('src/main.ts', MAIN.lastIndexOf('money'))).toEqual([
      { path: 'src/money.ts', from: MONEY.indexOf('money ='), to: MONEY.indexOf('money =') + 'money'.length },
    ])
  })

  it('finds no declaration for a symbol of the standard library', () => {
    expect(makeProject().definition('src/main.ts', MAIN.indexOf('console'))).toEqual([])
  })

  it('lists every reference of a symbol across the project, its declaration marked', () => {
    const project = makeProject()

    const search = project.references('src/money.ts', MONEY.indexOf('money ='))

    expect(search?.symbol).toBe('money')
    expect(search?.references.map(({ path, line, isDefinition }) => ({ path, line, isDefinition }))).toEqual([
      { path: 'src/main.ts', line: 1, isDefinition: false },
      { path: 'src/main.ts', line: 3, isDefinition: false },
      { path: 'src/money.ts', line: 4, isDefinition: true },
      { path: 'src/money.ts', line: 6, isDefinition: false },
      { path: 'tests/money.test.ts', line: 2, isDefinition: false },
      { path: 'tests/money.test.ts', line: 6, isDefinition: false },
    ])
    expect(search?.references[1]).toMatchObject({
      from: MAIN.lastIndexOf('money'),
      to: MAIN.lastIndexOf('money') + 'money'.length,
      lineText: 'console.log(money(100))',
    })
  })

  it('finds no reference outside of a symbol', () => {
    expect(makeProject().references('src/main.ts', MAIN.indexOf('\n\n') + 1)).toBeUndefined()
  })

  it('renames a symbol in every file that uses it', () => {
    const project = makeProject()

    const renamed = project.rename('src/main.ts', MAIN.lastIndexOf('money'), 'makeMoney')

    expect(renamed?.map(({ path, content }) => ({ path, content }))).toEqual([
      {
        path: 'src/main.ts',
        content: MAIN.replace('{ money }', '{ makeMoney }').replace('log(money', 'log(makeMoney'),
      },
      {
        path: 'src/money.ts',
        content: MONEY.replace('const money', 'const makeMoney').replace('=> money(', '=> makeMoney('),
      },
      {
        path: 'tests/money.test.ts',
        content: TEST.replace('{ money }', '{ makeMoney }').replace('expect(money', 'expect(makeMoney'),
      },
    ])
    expect(renamed?.[0]?.changes).toEqual([
      { from: MAIN.indexOf('money'), to: MAIN.indexOf('money') + 'money'.length, insert: 'makeMoney' },
      { from: MAIN.lastIndexOf('money'), to: MAIN.lastIndexOf('money') + 'money'.length, insert: 'makeMoney' },
    ])
    expect(project.diagnostics('src/main.ts')).toEqual([])
    expect(project.diagnostics('tests/money.test.ts')).toEqual([])
  })

  it('refuses to rename a symbol of the standard library', () => {
    expect(makeProject().rename('src/main.ts', MAIN.indexOf('console'), 'terminal')).toBeUndefined()
  })
})
