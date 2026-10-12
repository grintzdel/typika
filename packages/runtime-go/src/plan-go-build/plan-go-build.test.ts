import { describe, expect, it } from 'vitest'

import { findUnavailableImports, planGoBuild } from './plan-go-build.ts'

const STD = new Set(['fmt', 'testing', 'strings', 'internal/abi', 'net/http'])

const goMod = 'module example.com/shop\n\ngo 1.24\n'

describe('planGoBuild', () => {
  it('fails without a go.mod at the root', () => {
    expect(planGoBuild(new Map([['main.go', 'package main']]), STD)).toEqual({
      _tag: 'Invalid',
      diagnostics: [{ severity: 'error', message: 'go.mod file not found in the project root' }],
    })
  })

  it('groups files into packages, with their tests, external tests and imports', () => {
    const plan = planGoBuild(
      new Map([
        ['go.mod', goMod],
        ['main.go', 'package main\nimport "example.com/shop/money"\nfunc main() {}'],
        ['money/money.go', 'package money\nimport "fmt"'],
        ['money/money_test.go', 'package money\nimport "testing"\nfunc TestAdd(t *testing.T) {}'],
        [
          'money/format_test.go',
          'package money_test\nimport ("testing"; "example.com/shop/money")\nfunc TestFormat(t *testing.T) {}\nfunc TestMain(m *testing.M) {}',
        ],
      ]),
      STD
    )

    expect(plan._tag).toBe('Planned')
    if (plan._tag !== 'Planned') return
    expect(plan.module.path).toBe('example.com/shop')
    expect(plan.module.language).toBe('go1.24')
    expect([...plan.module.packages.keys()]).toEqual(['example.com/shop', 'example.com/shop/money'])
    expect(plan.module.packages.get('example.com/shop/money')).toEqual({
      importPath: 'example.com/shop/money',
      dir: 'money',
      name: 'money',
      goFiles: ['money/money.go'],
      testGoFiles: ['money/money_test.go'],
      xtestGoFiles: ['money/format_test.go'],
      imports: ['fmt'],
      testImports: ['testing'],
      xtestImports: ['example.com/shop/money', 'testing'],
      tests: [{ name: 'TestAdd', file: 'money/money_test.go' }],
      xtests: [{ name: 'TestFormat', file: 'money/format_test.go' }],
      testMain: 'xtest',
    })
  })

  it('leaves out nested modules, testdata, hidden and underscored directories, and other platforms', () => {
    const plan = planGoBuild(
      new Map([
        ['go.mod', goMod],
        ['shop.go', 'package shop'],
        ['shop_linux.go', 'package other'],
        ['exercises/go.mod', 'module exercises'],
        ['exercises/a/solution/x.go', 'package broken'],
        ['testdata/x.go', 'package broken'],
        ['_draft/x.go', 'package broken'],
        ['.cache/x.go', 'package broken'],
      ]),
      STD
    )

    expect(plan._tag === 'Planned' && [...plan.module.packages.keys()]).toEqual(['example.com/shop'])
  })

  it('reports two package names in one directory', () => {
    const plan = planGoBuild(
      new Map([
        ['go.mod', goMod],
        ['a/a.go', 'package a'],
        ['a/b.go', 'package b'],
      ]),
      STD
    )

    expect(plan).toEqual({
      _tag: 'Invalid',
      diagnostics: [
        {
          severity: 'error',
          message: 'found packages a (a.go) and b (b.go) in a',
          location: { file: 'a/b.go', line: 1, column: 1 },
        },
      ],
    })
  })

  it('reports an import of a package missing from the module', () => {
    const plan = planGoBuild(
      new Map([
        ['go.mod', goMod],
        ['a.go', 'package shop\nimport "example.com/shop/nope"'],
      ]),
      STD
    )

    expect(plan._tag === 'Invalid' && plan.diagnostics).toEqual([
      {
        severity: 'error',
        message: 'package example.com/shop/nope is not in the module',
        location: { file: 'a.go', line: 2, column: 8 },
      },
    ])
  })

  it('reports an import cycle', () => {
    const plan = planGoBuild(
      new Map([
        ['go.mod', goMod],
        ['a/a.go', 'package a\nimport "example.com/shop/b"'],
        ['b/b.go', 'package b\nimport "example.com/shop/a"'],
      ]),
      STD
    )

    expect(plan._tag === 'Invalid' && plan.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'import cycle not allowed: example.com/shop/a -> example.com/shop/b -> example.com/shop/a',
    ])
  })
})

describe('findUnavailableImports', () => {
  it('flags third-party modules, packages outside the shipped standard library, internal packages and cgo', () => {
    const files = new Map([
      ['go.mod', goMod],
      [
        'a.go',
        'package shop\nimport (\n\t"fmt"\n\t"example.com/shop/money"\n\t"github.com/acme/kit"\n\t"os/exec"\n\t"internal/abi"\n\t"C"\n)',
      ],
      ['money/m.go', 'package money'],
    ])

    expect(
      findUnavailableImports(files, STD).map((diagnostic) => [diagnostic.message, diagnostic.location?.line])
    ).toEqual([
      ['package github.com/acme/kit is not available: Typika runs Go with the standard library only.', 5],
      ['package os/exec is not in the standard library that Typika ships for the browser.', 6],
      ['package internal/abi is not in the standard library that Typika ships for the browser.', 7],
      ['cgo is not available in the browser: "C" cannot be imported.', 8],
    ])
  })
})
