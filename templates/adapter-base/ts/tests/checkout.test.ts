import { describe, expect, it, vi } from 'vitest'
import { openCheckout } from '../src/checkout/open-checkout.ts'
import { money } from '../src/shop/money.ts'
import { LegacyPayClient } from '../src/vendor/legacy-pay/legacy-pay-client.ts'
import { order } from './order-fixture.ts'

const payWith = (token: string) => openCheckout(new LegacyPayClient()).checkout.pay(order, { token })

describe('checkout', () => {
  it('charges the order total in euros', () => {
    const client = new LegacyPayClient()
    const makePayment = vi.spyOn(client, 'makePayment')

    openCheckout(client).checkout.pay(order, { token: 'tok_visa' })

    expect(makePayment).toHaveBeenCalledWith(3250, 978, 'tok_visa')
  })

  it('pays with an accepted card', () => {
    expect(payWith('tok_visa')).toEqual({ status: 'paid', paymentId: 'LP-1', amount: money(3250) })
  })

  it('declines a card without enough funds', () => {
    expect(payWith('tok_no_funds')).toEqual({
      status: 'declined',
      message: 'Your card was declined: insufficient funds.',
    })
  })

  it('declines an expired card', () => {
    expect(payWith('tok_expired')).toEqual({ status: 'declined', message: 'Your card has expired.' })
  })

  it('declines a card the issuer refuses', () => {
    expect(payWith('tok_refused')).toEqual({ status: 'declined', message: 'Your card was declined.' })
  })

  it('asks to try again later when the card issuer is unavailable', () => {
    expect(payWith('tok_issuer_down')).toEqual({ status: 'retry-later' })
  })
})
