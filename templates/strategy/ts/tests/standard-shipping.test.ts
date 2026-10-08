import { describe, expect, it } from 'vitest'
import { quoteShipping } from '../src/checkout/checkout.ts'
import { money } from '../src/shop/money.ts'
import { orderOf } from './order-fixture.ts'

describe('standard shipping', () => {
  it('charges 4.90 for orders up to 2 kg', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 3000, weightGrams: 2000 }), 'standard')

    expect(quote.shipping).toEqual(money(490))
  })

  it('charges 6.90 for orders over 2 kg', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 3000, weightGrams: 2001 }), 'standard')

    expect(quote.shipping).toEqual(money(690))
  })

  it('is free from 50.00, whatever the weight', () => {
    const quote = quoteShipping(orderOf({ subtotalCents: 5000, weightGrams: 9000 }), 'standard')

    expect(quote.shipping).toEqual(money(0))
  })
})
