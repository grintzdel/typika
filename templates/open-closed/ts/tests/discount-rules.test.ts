import { describe, expect, it } from 'vitest'
import type { DiscountRule } from '../src/pricing/discount-rule.ts'
import { discountsFor } from '../src/pricing/discount-rules.ts'
import { money } from '../src/shop/money.ts'
import { ada, orderOf } from './order-fixture.ts'

describe('discount rules', () => {
  it('applies a rule it has never seen before', () => {
    const everyOrder: DiscountRule = { discountFor: () => ({ label: 'Welcome', amount: money(100) }) }

    expect(discountsFor(orderOf(ada, 2000), [everyOrder])).toEqual([{ label: 'Welcome', amount: money(100) }])
  })

  it('skips the rules that do not apply', () => {
    const never: DiscountRule = { discountFor: () => undefined }

    expect(discountsFor(orderOf(ada, 2000), [never])).toEqual([])
  })
})
