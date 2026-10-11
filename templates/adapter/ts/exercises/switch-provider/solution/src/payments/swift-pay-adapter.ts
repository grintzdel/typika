import type { Money } from '../shop/money.ts'
import type { SwiftPayAmount, SwiftPayChargeResult, SwiftPayClient } from '../vendor/swift-pay/swift-pay-client.ts'
import type { Card, ChargeResult, PaymentGateway, RefundResult } from './payment-gateway.ts'

const swiftPayAmountOf = (amount: Money): SwiftPayAmount => ({
  value: `${Math.floor(amount.cents / 100)}.${String(amount.cents % 100).padStart(2, '0')}`,
  currency: amount.currency,
})

export class SwiftPayAdapter implements PaymentGateway {
  private readonly client: SwiftPayClient

  constructor(client: SwiftPayClient) {
    this.client = client
  }

  charge(amount: Money, card: Card): ChargeResult {
    return chargeResultOf(this.client.createCharge({ amount: swiftPayAmountOf(amount), source: card.token }))
  }

  refund(paymentId: string, amount: Money): RefundResult {
    const result = this.client.createRefund({ charge: paymentId, amount: swiftPayAmountOf(amount) })
    return result.ok ? { status: 'refunded' } : { status: 'rejected' }
  }
}

const chargeResultOf = (result: SwiftPayChargeResult): ChargeResult => {
  if (result.ok) return { status: 'approved', paymentId: result.id }
  switch (result.error) {
    case 'insufficient_funds':
      return { status: 'declined', reason: 'insufficient-funds' }
    case 'expired_card':
      return { status: 'declined', reason: 'expired-card' }
    case 'try_again':
      return { status: 'unavailable' }
    case 'card_declined':
      return { status: 'declined', reason: 'refused' }
  }
}
