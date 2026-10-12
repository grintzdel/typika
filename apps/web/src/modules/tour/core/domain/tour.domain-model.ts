import type { TourStep } from '@typika/manifest'

export type TourStepRef = { readonly id: string; readonly title: string }

export type LineSpan = { readonly from: number; readonly to: number }

export type TourAnchor =
  | { readonly _tag: 'TextOnly' }
  | { readonly _tag: 'File'; readonly path: string }
  | { readonly _tag: 'Highlighted'; readonly path: string; readonly range: LineSpan }
  | { readonly _tag: 'Changed'; readonly path: string; readonly originalRange: LineSpan | undefined }

const STEP_HASH_PREFIX = 'step='
const REGION_START = '// #region '
const REGION_END = '// #endregion'

const linesOf = (content: string): ReadonlyArray<string> => content.split(/\r?\n/)

export const regionRange = (content: string, region: string): LineSpan | undefined => {
  const lines = linesOf(content).map((line) => line.trim())
  const start = lines.indexOf(`${REGION_START}tour:${region}`)
  if (start === -1) return undefined
  let depth = 1
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (line.startsWith(REGION_START)) depth += 1
    if (line === REGION_END) depth -= 1
    if (depth === 0) return { from: start + 2, to: index }
  }
  return undefined
}

const sameLines = (current: string, original: string, range: LineSpan): boolean => {
  const slice = (content: string) => linesOf(content).slice(range.from - 1, range.to)
  const before = slice(original)
  const after = slice(current)
  return before.length === range.to - range.from + 1 && before.every((line, index) => line === after[index])
}

const rangeIn = (step: TourStep, content: string | undefined): LineSpan | undefined => {
  if (content === undefined) return undefined
  if (step.region !== undefined) return regionRange(content, step.region)
  if (step.lines !== undefined) return { from: step.lines.start, to: step.lines.end }
  return undefined
}

export const anchorOf = (step: TourStep, current: string | undefined, original: string | undefined): TourAnchor => {
  if (step.file === undefined) return { _tag: 'TextOnly' }
  const path = step.file
  if (step.region === undefined && step.lines === undefined) return { _tag: 'File', path }
  const originalRange = rangeIn(step, original)
  const changed: TourAnchor = { _tag: 'Changed', path, originalRange }
  if (current === undefined) return changed
  if (step.region !== undefined) {
    const range = regionRange(current, step.region)
    return range === undefined ? changed : { _tag: 'Highlighted', path, range }
  }
  if (originalRange === undefined || original === undefined || !sameLines(current, original, originalRange))
    return changed
  return { _tag: 'Highlighted', path, range: originalRange }
}

export const filesOfStep = (step: TourStep): ReadonlyArray<string> =>
  step.file === undefined ? step.also : [step.file, ...step.also]

export const hashOfStep = (step: TourStepRef): string => `${STEP_HASH_PREFIX}${step.id}`

export const stepIndexFromHash = (hash: string, steps: ReadonlyArray<TourStepRef>): number => {
  const value = hash.replace(/^#/, '')
  if (!value.startsWith(STEP_HASH_PREFIX)) return 0
  const id = value.slice(STEP_HASH_PREFIX.length)
  return Math.max(
    0,
    steps.findIndex((step) => step.id === id)
  )
}
