import { describe, expect, it } from 'vitest'

import type { GoPackage } from '../domain/go-package.domain-model.ts'
import { makeTestMain } from './make-test-main.ts'

const pkg = (overrides: Partial<GoPackage>): GoPackage => ({
  importPath: 'example.com/shop/money',
  dir: 'money',
  name: 'money',
  goFiles: ['money/money.go'],
  testGoFiles: [],
  xtestGoFiles: [],
  imports: [],
  testImports: [],
  xtestImports: [],
  tests: [],
  xtests: [],
  testMain: undefined,
  ...overrides,
})

describe('makeTestMain', () => {
  it('lists the internal and external tests, and runs them', () => {
    const source = makeTestMain(
      pkg({
        testGoFiles: ['money/money_test.go'],
        xtestGoFiles: ['money/format_test.go'],
        tests: [{ name: 'TestAdd', file: 'money/money_test.go' }],
        xtests: [{ name: 'TestFormat', file: 'money/format_test.go' }],
      })
    )

    expect(source).toContain('_test "example.com/shop/money"')
    expect(source).toContain('_xtest "example.com/shop/money_test"')
    expect(source).toContain('{"TestAdd", _test.TestAdd},')
    expect(source).toContain('{"TestFormat", _xtest.TestFormat},')
    expect(source).toContain('os.Exit(m.Run())')
  })

  it('imports a package without tests for its side effects only, and hands over to its TestMain', () => {
    const source = makeTestMain(pkg({ xtestGoFiles: ['money/main_test.go'], testMain: 'xtest' }))

    expect(source).toContain('_ "example.com/shop/money"')
    expect(source).toContain('_xtest.TestMain(m)')
  })
})
