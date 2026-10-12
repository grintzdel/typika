import { act, renderHook } from '@testing-library/react'
import type { TourStep } from '@typika/manifest'
import { afterEach, describe, expect, it } from 'vitest'

import type { ComparedVariant } from '../../core/programs/open-comparison/open-comparison.program.ts'
import { useCompareTour } from './use-compare-tour.ts'

const step = (id: string, overrides: Partial<TourStep> = {}): TourStep => ({
  path: `tour/${id}.md`,
  id,
  title: id,
  also: [],
  body: '',
  ...overrides,
})

const variant = (
  language: ComparedVariant['language'],
  entry: string,
  files: Readonly<Record<string, string>>,
  tourSteps: ReadonlyArray<TourStep>
): ComparedVariant => ({
  language,
  name: `strategy-${language}`,
  title: 'Strategy',
  entry,
  files: new Map(Object.entries(files)),
  tourSteps,
})

const TS = variant(
  'typescript',
  'src/main.ts',
  { 'src/main.ts': 'main', 'src/cost.ts': 'a\n// #region tour:contract\ninterface Cost {}\n// #endregion\n' },
  [
    step('overview', { file: 'src/main.ts' }),
    step('contract', { file: 'src/cost.ts', region: 'contract' }),
    step('trade-offs'),
  ]
)

const GO = variant('go', 'main.go', { 'main.go': 'package main' }, [
  step('overview', { file: 'main.go' }),
  step('trade-offs'),
])

const render = (a: ComparedVariant | undefined, b: ComparedVariant | undefined) =>
  renderHook(() => useCompareTour(a, b))

afterEach(() => window.history.replaceState(null, '', '/'))

describe('useCompareTour', () => {
  it('opens the first step in both columns', () => {
    const { result } = render(TS, GO)

    expect(result.current.steps.map(({ id }) => id)).toEqual(['overview', 'contract', 'trade-offs'])
    expect(result.current.columns.a.tabs.editorTab?.path).toBe('src/main.ts')
    expect(result.current.columns.b.tabs.editorTab?.path).toBe('main.go')
  })

  it('highlights the anchored range on one side and tells the other has no equivalent', () => {
    const { result } = render(TS, GO)

    act(() => result.current.tour.handleSelect(1))

    expect(result.current.columns.a.tabs.editorTab?.path).toBe('src/cost.ts')
    expect(result.current.columns.a.tabs.highlight).toEqual({ from: 3, to: 3 })
    expect(result.current.columns.a.view).toMatchObject({ _tag: 'Open' })
    expect(result.current.columns.b.view).toEqual({ _tag: 'Missing' })
    expect(result.current.columns.b.tabs.editorTab?.path).toBe('main.go')
  })

  it('has no step before both variants are loaded', () => {
    const { result } = render(undefined, undefined)

    expect(result.current.steps).toEqual([])
    expect(result.current.columns.a.view).toBeUndefined()
  })
})
