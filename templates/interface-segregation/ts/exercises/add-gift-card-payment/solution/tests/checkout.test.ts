import { describe, expect, it } from 'vitest'
import type { Chargeable } from '../src/payments/capabilities.ts'
import { Checkout } from '../src/payments/clients/checkout.ts'
import { money } from '../src/shop/money.ts'

describe('checkout', () => {
  it('pays through any method that can charge, and nothing more', () => {
    const charged: number[] = []
    const onlyCharges: Chargeable = {
      charge: (amount) => {
        charged.push(amount.cents)
        return { id: 'fake-1', method: 'card', amount }
      },
    }

    new Checkout({ card: onlyCharges, 'bank-transfer': onlyCharges, 'gift-card': onlyCharges }).pay('card', money(1500))

    expect(charged).toEqual([1500])
  })
})
