import { describe, expect, it } from 'vitest'
import { quoteShipping } from '../src/checkout/checkout.ts'
import { money } from '../src/shop/money.ts'
import { orderOf } from './order-fixture.ts'

describe('express shipping', () => {
  it('charges 12.90 for orders up to 2 kg', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 3000, weightGrams: 1500 }), 'express')

    expect(quote.shipping).toEqual(money(1290))
  })

  it('charges 18.90 for orders over 2 kg', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 3000, weightGrams: 2500 }), 'express')

    expect(quote.shipping).toEqual(money(1890))
  })

  it('is never free for regular customers', () => {
    const quote = quoteShipping(orderOf({ tier: 'regular', subtotalCents: 20000, weightGrams: 1000 }), 'express')

    expect(quote.shipping).toEqual(money(1290))
  })

  it('is free for members from 50.00', () => {
    const quote = quoteShipping(orderOf({ tier: 'member', subtotalCents: 5000, weightGrams: 2500 }), 'express')

    expect(quote.shipping).toEqual(money(0))
  })

  it('is paid by members under 50.00', () => {
    const quote = quoteShipping(orderOf({ tier: 'member', subtotalCents: 4999, weightGrams: 1000 }), 'express')

    expect(quote.shipping).toEqual(money(1290))
  })
})
