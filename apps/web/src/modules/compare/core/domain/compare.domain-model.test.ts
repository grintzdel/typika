import type { TourStep } from '@typika/manifest'
import { describe, expect, it } from 'vitest'

import { alignSteps, chooseSides, columnViewOf, type VariantLink } from './compare.domain-model.ts'

const step = (id: string, overrides: Partial<TourStep> = {}): TourStep => ({
  path: `tour/${id}.md`,
  id,
  title: id,
  also: [],
  body: '',
  ...overrides,
})

const TS: VariantLink = { language: 'typescript', name: 'strategy-ts' }
const GO: VariantLink = { language: 'go', name: 'strategy-go' }
const KOTLIN: VariantLink = { language: 'kotlin', name: 'strategy-kotlin' }

describe('chooseSides', () => {
  it('keeps the requested languages', () => {
    expect(chooseSides([TS, GO, KOTLIN], 'kotlin', 'go')).toEqual({ _tag: 'Chosen', a: KOTLIN, b: GO })
  })

  it('puts TypeScript on the left and the first other variant on the right by default', () => {
    expect(chooseSides([TS, GO, KOTLIN], undefined, undefined)).toEqual({ _tag: 'Chosen', a: TS, b: GO })
  })

  it('falls back to the first variant on the left without TypeScript', () => {
    expect(chooseSides([GO, KOTLIN], undefined, undefined)).toEqual({ _tag: 'Chosen', a: GO, b: KOTLIN })
  })

  it('picks the first other variant when only the left one is given', () => {
    expect(chooseSides([TS, GO], 'go', undefined)).toEqual({ _tag: 'Chosen', a: GO, b: TS })
  })

  it('names the language that no variant uses', () => {
    expect(chooseSides([TS, GO], 'typescript', 'cobol')).toEqual({ _tag: 'Unavailable', language: 'cobol' })
  })

  it('refuses to compare a variant with itself', () => {
    expect(chooseSides([TS, GO], 'go', 'go')).toEqual({ _tag: 'SameLanguage' })
  })

  it('needs a second variant', () => {
    expect(chooseSides([TS], undefined, undefined)).toEqual({ _tag: 'NoVariant' })
  })
})

describe('alignSteps', () => {
  it('pairs the steps by id in the order of the left tour', () => {
    const aligned = alignSteps([step('overview'), step('context')], [step('context'), step('overview')])

    expect(aligned.map(({ id, a, b }) => [id, a?.id, b?.id])).toEqual([
      ['overview', 'overview', 'overview'],
      ['context', 'context', 'context'],
    ])
  })

  it('keeps a step missing on one side', () => {
    const aligned = alignSteps(
      [step('overview'), step('interface'), step('trade-offs')],
      [step('overview'), step('trade-offs')]
    )

    expect(aligned.map(({ id, a, b }) => [id, a?.id, b?.id])).toEqual([
      ['overview', 'overview', 'overview'],
      ['interface', 'interface', undefined],
      ['trade-offs', 'trade-offs', 'trade-offs'],
    ])
  })

  it('places a step of the right tour after the step it follows there', () => {
    const aligned = alignSteps(
      [step('overview'), step('trade-offs')],
      [step('intro'), step('overview'), step('goroutines'), step('channels'), step('trade-offs')]
    )

    expect(aligned.map(({ id }) => id)).toEqual(['intro', 'overview', 'goroutines', 'channels', 'trade-offs'])
  })

  it('titles a step after the left tour when both have it', () => {
    const aligned = alignSteps(
      [step('interface', { title: 'One interface' })],
      [step('interface', { title: 'A function' }), step('extra', { title: 'Only on the right' })]
    )

    expect(aligned.map(({ title }) => title)).toEqual(['One interface', 'Only on the right'])
  })
})

describe('columnViewOf', () => {
  const CONTENT = ['package checkout', '', '// #region tour:contract', 'type Cost func() int', '// #endregion'].join(
    '\n'
  )
  const contentOf = (path: string) => (path === 'cost.go' ? CONTENT : undefined)

  it('opens the anchored file and its region', () => {
    expect(
      columnViewOf(step('contract', { file: 'cost.go', region: 'contract', also: ['a.go'] }), undefined, contentOf)
    ).toEqual({
      _tag: 'Open',
      files: ['cost.go', 'a.go'],
      range: { from: 4, to: 4 },
    })
  })

  it('opens a file without a range', () => {
    expect(columnViewOf(step('overview', { file: 'cost.go' }), undefined, contentOf)).toEqual({
      _tag: 'Open',
      files: ['cost.go'],
      range: undefined,
    })
  })

  it('tells when the step is missing', () => {
    expect(columnViewOf(undefined, step('contract', { file: 'cost.ts' }), contentOf)).toEqual({ _tag: 'Missing' })
  })

  it('shows the text of a step whose code dissolved in the language', () => {
    expect(
      columnViewOf(step('contract', { body: 'No interface in Go.' }), step('contract', { file: 'cost.ts' }), contentOf)
    ).toEqual({ _tag: 'Dissolved', body: 'No interface in Go.' })
  })

  it('keeps the column as it is when neither side has code for the step', () => {
    expect(columnViewOf(step('trade-offs'), step('trade-offs'), contentOf)).toEqual({ _tag: 'Keep' })
  })
})
