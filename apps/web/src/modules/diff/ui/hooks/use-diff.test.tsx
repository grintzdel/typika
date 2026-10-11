import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDiff, type UseDiffOptions } from './use-diff.ts'

const files = (entries: Readonly<Record<string, string>>): ReadonlyMap<string, string> =>
  new Map(Object.entries(entries))

const TEMPLATE = files({
  'src/quote.ts': '// #region tour:context\nnew\n// #endregion\n',
  'src/main.ts': 'main',
  'tests/quote.test.ts': 'test',
})

const BASE = {
  name: 'sample-base-ts',
  files: files({ 'src/quote.ts': 'old\n', 'src/main.ts': 'main', 'tests/quote.test.ts': 'old test' }),
  focus: ['src/**'],
}

const renderDiff = (overrides: Partial<UseDiffOptions> = {}) =>
  renderHook(() => useDiff({ templateFiles: TEMPLATE, currentFiles: TEMPLATE, base: BASE, ...overrides }))

describe('useDiff', () => {
  it('starts on the diff from the base, in the focus and without the tour markers', () => {
    const { result } = renderDiff()

    expect(result.current.source).toBe('base')
    expect(result.current.changes).toEqual([
      { path: 'src/quote.ts', status: 'modified', before: 'old\n', after: 'new\n' },
    ])
  })

  it('starts on my changes without a base', () => {
    const { result } = renderDiff({ base: undefined })

    expect(result.current.source).toBe('mine')
    expect(result.current.changes).toEqual([])
  })

  it('lists my changes since the template', () => {
    const { result } = renderDiff({ currentFiles: new Map([...TEMPLATE, ['src/main.ts', 'edited']]) })

    act(() => result.current.handleSourceChange('mine'))

    expect(result.current.changes).toEqual([
      { path: 'src/main.ts', status: 'modified', before: 'main', after: 'edited' },
    ])
  })

  it('gives the two versions of a file for each source', () => {
    const { result } = renderDiff({ currentFiles: new Map([...TEMPLATE, ['src/main.ts', 'edited']]) })

    expect(result.current.versionsOf('base', 'src/quote.ts')).toEqual({ before: 'old\n', after: 'new\n' })
    expect(result.current.versionsOf('mine', 'src/main.ts')).toEqual({ before: 'main', after: 'edited' })
  })

  it('switches the layout', () => {
    const { result } = renderDiff()

    act(() => result.current.handleLayoutChange('unified'))

    expect(result.current.layout).toBe('unified')
  })
})
