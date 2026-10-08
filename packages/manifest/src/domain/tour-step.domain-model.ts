import * as Schema from 'effect/Schema'

import { RelativePathSchema, SlugSchema } from './manifest.domain-model.ts'

export const MAX_HIGHLIGHTED_LINES = 40

const LINE_RANGE = /^([1-9]\d*)(?:-([1-9]\d*))?$/

export type LineRange = { readonly start: number; readonly end: number }

export const parseLineRange = (input: string): LineRange | undefined => {
  const match = LINE_RANGE.exec(input)
  if (match === null) return undefined
  const start = Number(match[1])
  const end = match[2] === undefined ? start : Number(match[2])
  return start <= end && end - start < MAX_HIGHLIGHTED_LINES ? { start, end } : undefined
}

export const TourStepFrontMatterSchema = Schema.Struct({
  id: SlugSchema,
  title: Schema.String.check(
    Schema.isMinLength(1, { expected: '1 to 60 characters' }),
    Schema.isMaxLength(60, { expected: '1 to 60 characters' })
  ),
  file: Schema.optionalKey(RelativePathSchema),
  lines: Schema.optionalKey(
    Schema.String.check(
      Schema.makeFilter((input: string) => parseLineRange(input) !== undefined, {
        expected: `"N" or "N-M", 1-indexed, at most ${MAX_HIGHLIGHTED_LINES} lines`,
      })
    )
  ),
  region: Schema.optionalKey(SlugSchema),
  also: Schema.optionalKey(Schema.Array(RelativePathSchema)),
})

export type TourStep = {
  readonly path: string
  readonly id: string
  readonly title: string
  readonly file?: string
  readonly lines?: LineRange
  readonly region?: string
  readonly also: ReadonlyArray<string>
  readonly body: string
}
