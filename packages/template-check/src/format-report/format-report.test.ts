import { describe, expect, it } from 'vitest'

import { formatReport, hasErrors } from './format-report.ts'

const CHECKS = [
  { dir: 'strategy/ts', name: 'strategy-ts', issues: [], exercisesRun: true },
  {
    dir: 'strategy/go',
    name: 'strategy-go',
    issues: [
      {
        code: 'W_VARIANT_NOT_SYMMETRIC',
        path: 'variants.kotlin',
        message: '"x" does not list this template as a variant.',
      },
    ],
    exercisesRun: false,
  },
  {
    dir: 'broken/ts',
    name: undefined,
    issues: [{ code: 'E_ENTRY_NOT_FOUND', path: 'runtime.entry', message: 'Entry file "src/main.ts" does not exist.' }],
    exercisesRun: false,
  },
] as const

describe('formatReport', () => {
  it('lists each template with its issues and a summary', () => {
    expect(formatReport(CHECKS)).toBe(
      [
        '✓ strategy-ts (strategy/ts), exercises run',
        '✓ strategy-go (strategy/go)',
        '  W_VARIANT_NOT_SYMMETRIC variants.kotlin: "x" does not list this template as a variant.',
        '✗ broken/ts',
        '  E_ENTRY_NOT_FOUND runtime.entry: Entry file "src/main.ts" does not exist.',
        '',
        '3 templates, 1 with errors, 1 warning.',
      ].join('\n')
    )
  })

  it('fails only on errors', () => {
    expect(hasErrors(CHECKS)).toBe(true)
    expect(hasErrors(CHECKS.slice(0, 2))).toBe(false)
  })
})
