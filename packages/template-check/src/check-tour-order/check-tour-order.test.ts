import { describe, expect, it } from 'vitest'

import { manifestOf } from '../__tests__/manifest.factory.ts'
import { checkTourOrder } from './check-tour-order.ts'

const TS = 'github:typika/templates/strategy/ts'
const REFERENCE = ['overview', 'context', 'strategy-interface', 'delegate', 'trade-offs']

const kotlin = manifestOf({
  name: 'strategy-kotlin',
  language: 'kotlin',
  kind: 'kotlin',
  extra: `\n[variants]\ntypescript = "${TS}@8a33c091e750"\n`,
})

const tourIdsAt = (ref: string) => (ref.replace(/@.*$/, '') === TS ? REFERENCE : undefined)

describe('checkTourOrder', () => {
  it('accepts a variant that keeps the reference order, even with steps left out or added', () => {
    const ids = ['overview', 'context', 'lambdas', 'delegate', 'trade-offs']

    expect(checkTourOrder(kotlin, ids, tourIdsAt)).toEqual([])
  })

  it('reports the shared steps that are out of order', () => {
    const ids = ['overview', 'delegate', 'context', 'strategy-interface', 'trade-offs']

    expect(checkTourOrder(kotlin, ids, tourIdsAt)).toEqual([
      {
        code: 'W_TOUR_ORDER_DIVERGES',
        path: 'tour.steps',
        message:
          'Tour steps "delegate", "context", "strategy-interface" are not in the same order as the reference variant.',
      },
    ])
  })

  it('does not compare the reference with its own variants', () => {
    const typescript = manifestOf({ extra: '\n[variants]\nkotlin = "github:typika/templates/strategy/kotlin"\n' })

    expect(checkTourOrder(typescript, ['trade-offs', 'overview'], () => ['overview', 'trade-offs'])).toEqual([])
  })

  it('skips a template without a TypeScript variant, or one that does not resolve', () => {
    const go = manifestOf({ name: 'strategy-go', language: 'go', kind: 'go' })

    expect(checkTourOrder(go, ['trade-offs', 'overview'], tourIdsAt)).toEqual([])
    expect(checkTourOrder(kotlin, ['trade-offs', 'overview'], () => undefined)).toEqual([])
  })
})
