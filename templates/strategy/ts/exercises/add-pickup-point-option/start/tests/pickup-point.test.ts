import { describe, expect, it } from 'vitest'
import { quoteShipping } from '../src/checkout/checkout.ts'
import { SHIPPING_OPTIONS } from '../src/checkout/shipping-option.ts'
import { money } from '../src/shop/money.ts'
import { orderOf } from './order-fixture.ts'

describe('pickup-point shipping', () => {
  it('is offered next to the other shipping options', () => {
    expect(SHIPPING_OPTIONS).toContain('pickup-point')
  })

  it('charges a flat 2.90, whatever the weight', () => {
    const light = quoteShipping(orderOf({ subtotalCents: 1000, weightGrams: 500 }), 'pickup-point')
    const heavy = quoteShipping(orderOf({ subtotalCents: 1000, weightGrams: 9000 }), 'pickup-point')

    expect(light.shipping).toEqual(money(290))
    expect(heavy.shipping).toEqual(money(290))
  })

  it('is free from 25.00', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 2500, weightGrams: 500 }), 'pickup-point')

    expect(quote.shipping).toEqual(money(0))
  })

  it('is always free for members', () => {
    const quote = quoteShipping(orderOf({ tier: 'member', subtotalCents: 800, weightGrams: 500 }), 'pickup-point')

    expect(quote.shipping).toEqual(money(0))
  })

  it('leaves standard shipping unchanged between 25.00 and 50.00', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 3000, weightGrams: 500 }), 'standard')

    expect(quote.shipping).toEqual(money(490))
  })

  it('leaves express shipping paid for members under 50.00', () => {
    const quote = quoteShipping(orderOf({ tier: 'member', subtotalCents: 800, weightGrams: 500 }), 'express')

    expect(quote.shipping).toEqual(money(1290))
  })
})
