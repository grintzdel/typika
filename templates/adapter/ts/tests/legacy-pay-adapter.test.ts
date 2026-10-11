import { describe, expect, it, vi } from 'vitest'
import { LegacyPayAdapter } from '../src/payments/legacy-pay-adapter.ts'
import { money } from '../src/shop/money.ts'
import { LegacyPayClient } from '../src/vendor/legacy-pay/legacy-pay-client.ts'

describe('LegacyPayAdapter', () => {
  it('sends the amount in cents and the currency as its ISO numeric code', () => {
    const client = new LegacyPayClient()
    const makePayment = vi.spyOn(client, 'makePayment')

    new LegacyPayAdapter(client).charge(money(1999), { token: 'tok_visa' })

    expect(makePayment).toHaveBeenCalledWith(1999, 978, 'tok_visa')
  })

  it('turns an approval into an approved charge with the payment reference', () => {
    expect(new LegacyPayAdapter(new LegacyPayClient()).charge(money(1999), { token: 'tok_visa' })).toEqual({
      status: 'approved',
      paymentId: 'LP-1',
    })
  })

  it('declines a charge on a code it does not know', () => {
    expect(new LegacyPayAdapter(new LegacyPayClient()).charge(money(1999), { token: 'tok_fraud' })).toEqual({
      status: 'declined',
      reason: 'refused',
    })
  })

  it('turns an approved reversal into a refund', () => {
    const adapter = new LegacyPayAdapter(new LegacyPayClient())
    adapter.charge(money(1999), { token: 'tok_visa' })

    expect(adapter.refund('LP-1', money(1999))).toEqual({ status: 'refunded' })
  })
})
