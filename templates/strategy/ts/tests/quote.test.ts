import { describe, expect, it } from 'vitest'
import { quoteShipping } from '../src/checkout/checkout.ts'
import { money } from '../src/shop/money.ts'
import type { Order } from '../src/shop/order.ts'

describe('quote', () => {
  const order: Order = {
    customer: { name: 'Ada', tier: 'regular' },
    lines: [
      { sku: 'MUG-01', unitPrice: money(1200), quantity: 2, unitWeightGrams: 400 },
      { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1, unitWeightGrams: 250 },
    ],
  }

  it('sums every line into the subtotal', () => {
    expect(quoteShipping(order, 'standard').subtotal).toEqual(money(3250))
  })

  it('adds the shipping cost to the subtotal', () => {
    expect(quoteShipping(order, 'standard').total).toEqual(money(3740))
  })
})
