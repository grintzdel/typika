import { Language, type TourStep } from '@typika/manifest'

import { anchorOf, filesOfStep, type LineSpan } from '../../../tour/core/domain/tour.domain-model.ts'

export type VariantLink = { readonly language: Language; readonly name: string }

export type SidesChoice =
  | { readonly _tag: 'Chosen'; readonly a: VariantLink; readonly b: VariantLink }
  | { readonly _tag: 'Unavailable'; readonly language: string }
  | { readonly _tag: 'SameLanguage' }
  | { readonly _tag: 'NoVariant' }

export type ComparedStep = {
  readonly id: string
  readonly title: string
  readonly a: TourStep | undefined
  readonly b: TourStep | undefined
}

export type ColumnView =
  | { readonly _tag: 'Open'; readonly files: ReadonlyArray<string>; readonly range: LineSpan | undefined }
  | { readonly _tag: 'Keep' }
  | { readonly _tag: 'Missing' }
  | { readonly _tag: 'Dissolved'; readonly body: string }

export type ComparedViews = { readonly a: ColumnView; readonly b: ColumnView }

const LANGUAGE_ORDER: ReadonlyArray<string> = Object.values(Language)

export const byLanguage = (a: VariantLink, b: VariantLink): number =>
  LANGUAGE_ORDER.indexOf(a.language) - LANGUAGE_ORDER.indexOf(b.language)

export const chooseSides = (
  variants: ReadonlyArray<VariantLink>,
  a: string | undefined,
  b: string | undefined
): SidesChoice => {
  const find = (language: string) => variants.find((variant) => variant.language === language)
  const left = a === undefined ? (find(Language.TYPESCRIPT) ?? variants[0]) : find(a)
  if (left === undefined) return a === undefined ? { _tag: 'NoVariant' } : { _tag: 'Unavailable', language: a }
  const right = b === undefined ? variants.find((variant) => variant !== left) : find(b)
  if (right === undefined) return b === undefined ? { _tag: 'NoVariant' } : { _tag: 'Unavailable', language: b }
  if (right === left) return { _tag: 'SameLanguage' }
  return { _tag: 'Chosen', a: left, b: right }
}

export const alignSteps = (a: ReadonlyArray<TourStep>, b: ReadonlyArray<TourStep>): ReadonlyArray<ComparedStep> => {
  const aligned: Array<ComparedStep> = a.map((step) => ({
    id: step.id,
    title: step.title,
    a: step,
    b: b.find((other) => other.id === step.id),
  }))
  let cursor = 0
  for (const step of b) {
    const shared = aligned.findIndex((compared) => compared.id === step.id)
    if (shared !== -1) {
      cursor = shared + 1
      continue
    }
    aligned.splice(cursor, 0, { id: step.id, title: step.title, a: undefined, b: step })
    cursor += 1
  }
  return aligned
}

export const columnViewOf = (
  step: TourStep | undefined,
  other: TourStep | undefined,
  contentOf: (path: string) => string | undefined
): ColumnView => {
  if (step === undefined) return { _tag: 'Missing' }
  if (step.file === undefined)
    return other?.file === undefined ? { _tag: 'Keep' } : { _tag: 'Dissolved', body: step.body }
  const content = contentOf(step.file)
  const anchor = anchorOf(step, content, content)
  return { _tag: 'Open', files: filesOfStep(step), range: anchor._tag === 'Highlighted' ? anchor.range : undefined }
}
