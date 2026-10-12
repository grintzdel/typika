import { describe, expect, it } from 'vitest'

import { parseToolDiagnostics } from './go-builder.ts'

describe('parseToolDiagnostics', () => {
  it('locates compiler errors in the project, and keeps continuation lines in their message', () => {
    expect(
      parseToolDiagnostics(
        [
          '/work/internal/checkout/quote.go:12:3: undefined: missing',
          '/work/main.go:4:2: cannot use x (variable of type int) as string value in argument to f',
          '\thave (int)',
          '\twant (string)',
          '/tmp/testmain/_root/_testmain.go:9:2: undefined: _test.TestGone',
          'too many errors',
          '',
        ].join('\n')
      )
    ).toEqual([
      {
        severity: 'error',
        message: 'undefined: missing',
        location: { file: 'internal/checkout/quote.go', line: 12, column: 3 },
      },
      {
        severity: 'error',
        message: 'cannot use x (variable of type int) as string value in argument to f\nhave (int)\nwant (string)',
        location: { file: 'main.go', line: 4, column: 2 },
      },
      { severity: 'error', message: 'undefined: _test.TestGone' },
      { severity: 'error', message: 'too many errors' },
    ])
  })
})
