import { describe, expect, it } from 'vitest'
import { openCheckout } from '../src/checkout/open-checkout.ts'
import { money } from '../src/shop/money.ts'
import { LegacyPayClient } from '../src/vendor/legacy-pay/legacy-pay-client.ts'
import { order } from './order-fixture.ts'

describe('cancellation', () => {
  it('refunds a paid order', () => {
    const { checkout, cancellation } = openCheckout(new LegacyPayClient())
    const payment = checkout.pay(order, { token: 'tok_visa' })
    if (payment.status !== 'paid') throw new Error('The test order should be paid')

    expect(cancellation.cancel(payment.paymentId, payment.amount)).toEqual({ status: 'refunded' })
  })

  it('reports a refund for an unknown payment as failed', () => {
    const { cancellation } = openCheckout(new LegacyPayClient())

    expect(cancellation.cancel('LP-404', money(3250))).toEqual({ status: 'refund-failed' })
  })

  it('reports a refund larger than the payment as failed', () => {
    const { checkout, cancellation } = openCheckout(new LegacyPayClient())
    const payment = checkout.pay(order, { token: 'tok_visa' })
    if (payment.status !== 'paid') throw new Error('The test order should be paid')

    expect(cancellation.cancel(payment.paymentId, money(9999))).toEqual({ status: 'refund-failed' })
  })
})
