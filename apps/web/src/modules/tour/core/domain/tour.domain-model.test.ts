import type { TourStep } from '@typika/manifest'
import { describe, expect, it } from 'vitest'

import {
  anchorOf,
  filesOfStep,
  hashOfStep,
  regionRange,
  resolveTourLink,
  stepIndexFromHash,
} from './tour.domain-model.ts'

const step = (overrides: Partial<TourStep> = {}): TourStep => ({
  path: 'tour/01-step.md',
  id: 'step',
  title: 'Step',
  also: [],
  body: '',
  ...overrides,
})

const QUOTE = [
  "import type { Order } from './order.ts'",
  '',
  '// #region tour:context',
  'export class Quote {',
  '  // #region tour:inner',
  '  total = 0',
  '  // #endregion',
  '}',
  '// #endregion',
  '',
].join('\n')

describe('regionRange', () => {
  it('returns the lines between the markers', () => {
    expect(regionRange(QUOTE, 'context')).toEqual({ from: 4, to: 8 })
  })

  it('finds an indented region', () => {
    expect(regionRange(QUOTE, 'inner')).toEqual({ from: 6, to: 6 })
  })

  it('returns nothing when the region is missing or never closed', () => {
    expect(regionRange(QUOTE, 'missing')).toBeUndefined()
    expect(regionRange('// #region tour:open\nconst a = 1\n', 'open')).toBeUndefined()
  })
})

describe('anchorOf', () => {
  it('has no file for a text-only step', () => {
    expect(anchorOf(step(), undefined, undefined)).toEqual({ _tag: 'TextOnly' })
  })

  it('opens the file without a range when the step has no anchor', () => {
    expect(anchorOf(step({ file: 'src/main.ts' }), 'a', 'a')).toEqual({ _tag: 'File', path: 'src/main.ts' })
  })

  it('highlights a region of the current content', () => {
    const edited = `// added\n${QUOTE}`

    expect(anchorOf(step({ file: 'src/quote.ts', region: 'context' }), edited, QUOTE)).toEqual({
      _tag: 'Highlighted',
      path: 'src/quote.ts',
      range: { from: 5, to: 9 },
    })
  })

  it('reports a changed region and keeps its range in the original', () => {
    const edited = QUOTE.replace('// #region tour:context\n', '')

    expect(anchorOf(step({ file: 'src/quote.ts', region: 'context' }), edited, QUOTE)).toEqual({
      _tag: 'Changed',
      path: 'src/quote.ts',
      originalRange: { from: 4, to: 8 },
    })
  })

  it('highlights lines that still match the original', () => {
    expect(anchorOf(step({ file: 'src/quote.ts', lines: { start: 4, end: 5 } }), QUOTE, QUOTE)).toEqual({
      _tag: 'Highlighted',
      path: 'src/quote.ts',
      range: { from: 4, to: 5 },
    })
  })

  it('reports changed lines', () => {
    const edited = QUOTE.replace('export class Quote', 'export class Price')

    expect(anchorOf(step({ file: 'src/quote.ts', lines: { start: 4, end: 5 } }), edited, QUOTE)).toEqual({
      _tag: 'Changed',
      path: 'src/quote.ts',
      originalRange: { from: 4, to: 5 },
    })
  })

  it('reports a missing file as changed', () => {
    expect(anchorOf(step({ file: 'src/quote.ts', region: 'context' }), undefined, QUOTE)).toEqual({
      _tag: 'Changed',
      path: 'src/quote.ts',
      originalRange: { from: 4, to: 8 },
    })
  })
})

describe('filesOfStep', () => {
  it('lists the anchored file first, then the other ones', () => {
    expect(filesOfStep(step({ file: 'src/quote.ts', also: ['tests/quote.test.ts'] }))).toEqual([
      'src/quote.ts',
      'tests/quote.test.ts',
    ])
  })

  it('has no file for a text-only step', () => {
    expect(filesOfStep(step())).toEqual([])
  })
})

describe('step hash', () => {
  const steps = [step({ id: 'overview' }), step({ id: 'context' })]

  it('writes the step id in the hash', () => {
    expect(hashOfStep(step({ id: 'context' }))).toBe('step=context')
  })

  it('reads the step index from the hash', () => {
    expect(stepIndexFromHash('step=context', steps)).toBe(1)
    expect(stepIndexFromHash('#step=context', steps)).toBe(1)
  })

  it('falls back to the first step', () => {
    expect(stepIndexFromHash('', steps)).toBe(0)
    expect(stepIndexFromHash('step=unknown', steps)).toBe(0)
  })
})

describe('resolveTourLink', () => {
  const embedded = ['strategy-ts', 'observer-ts']

  it('opens an embedded template in its sandbox', () => {
    expect(resolveTourLink('typika:observer-ts', embedded)).toEqual({ _tag: 'Template', href: '/play/observer-ts' })
  })

  it('keeps a template that is not embedded as text', () => {
    expect(resolveTourLink('typika:open-closed-ts', embedded)).toEqual({ _tag: 'Text' })
  })

  it('opens web links', () => {
    expect(resolveTourLink('https://refactoring.guru/', embedded)).toEqual({
      _tag: 'External',
      href: 'https://refactoring.guru/',
    })
  })

  it('keeps any other link as text', () => {
    expect(resolveTourLink('javascript:alert(1)', embedded)).toEqual({ _tag: 'Text' })
    expect(resolveTourLink('src/main.ts', embedded)).toEqual({ _tag: 'Text' })
    expect(resolveTourLink(undefined, embedded)).toEqual({ _tag: 'Text' })
  })
})
