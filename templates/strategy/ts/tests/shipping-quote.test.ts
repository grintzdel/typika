import { describe, expect, it } from 'vitest'
import type { ShippingCost } from '../src/checkout/shipping-cost.ts'
import { ShippingQuote } from '../src/checkout/shipping-quote.ts'
import { money } from '../src/shop/money.ts'
import { orderOf } from './order-fixture.ts'

describe('ShippingQuote', () => {
  it('uses whichever shipping cost it is given', () => {
    const flatRate: ShippingCost = { costFor: () => money(100) }

    const quote = new ShippingQuote(flatRate).for(orderOf({ subtotalCents: 2000, weightGrams: 500 }))

    expect(quote).toEqual({ subtotal: money(2000), shipping: money(100), total: money(2100) })
  })
})
