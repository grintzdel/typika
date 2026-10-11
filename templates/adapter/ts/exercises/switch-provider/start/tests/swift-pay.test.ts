import { describe, expect, it, vi } from 'vitest'
import * as desks from '../src/checkout/open-checkout.ts'
import { money } from '../src/shop/money.ts'
import { SwiftPayClient } from '../src/vendor/swift-pay/swift-pay-client.ts'
import { order } from './order-fixture.ts'

const openSwiftPayCheckout = (client = new SwiftPayClient()) => desks.openCheckoutWithSwiftPay(client)
const payWith = (source: string) => openSwiftPayCheckout().checkout.pay(order, { token: source })

describe('checkout with SwiftPay', () => {
  it('charges the order total as a decimal amount in euros', () => {
    const client = new SwiftPayClient()
    const createCharge = vi.spyOn(client, 'createCharge')

    openSwiftPayCheckout(client).checkout.pay(order, { token: 'src_visa' })

    expect(createCharge).toHaveBeenCalledWith({ amount: { value: '32.50', currency: 'EUR' }, source: 'src_visa' })
  })

  it('pays with an accepted card', () => {
    expect(payWith('src_visa')).toEqual({ status: 'paid', paymentId: 'sp_ch_1', amount: money(3250) })
  })

  it('declines a card without enough funds', () => {
    expect(payWith('src_no_funds')).toEqual({
      status: 'declined',
      message: 'Your card was declined: insufficient funds.',
    })
  })

  it('declines an expired card', () => {
    expect(payWith('src_expired')).toEqual({ status: 'declined', message: 'Your card has expired.' })
  })

  it('declines a card the bank refuses', () => {
    expect(payWith('src_declined')).toEqual({ status: 'declined', message: 'Your card was declined.' })
  })

  it('asks to try again later when SwiftPay is busy', () => {
    expect(payWith('src_busy')).toEqual({ status: 'retry-later' })
  })
})

describe('cancellation with SwiftPay', () => {
  it('refunds a paid order', () => {
    const { checkout, cancellation } = openSwiftPayCheckout()
    const payment = checkout.pay(order, { token: 'src_visa' })
    if (payment.status !== 'paid') throw new Error('The test order should be paid')

    expect(cancellation.cancel(payment.paymentId, payment.amount)).toEqual({ status: 'refunded' })
  })

  it('reports a refund for an unknown payment as failed', () => {
    expect(openSwiftPayCheckout().cancellation.cancel('sp_ch_404', money(3250))).toEqual({ status: 'refund-failed' })
  })
})
