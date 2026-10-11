import type { Money } from '../shop/money.ts'
import {
  LEGACY_PAY_CODES,
  type LegacyPayClient,
  type LegacyPayResponse,
} from '../vendor/legacy-pay/legacy-pay-client.ts'
import type { Card, ChargeResult, PaymentGateway, RefundResult } from './payment-gateway.ts'

const NUMERIC_CURRENCY_CODES = { EUR: 978 } as const

// #region tour:translation
export class LegacyPayAdapter implements PaymentGateway {
  private readonly client: LegacyPayClient

  constructor(client: LegacyPayClient) {
    this.client = client
  }

  charge(amount: Money, card: Card): ChargeResult {
    const response = this.client.makePayment(amount.cents, NUMERIC_CURRENCY_CODES[amount.currency], card.token)
    return chargeResultOf(response)
  }

  refund(paymentId: string, amount: Money): RefundResult {
    const response = this.client.reversePayment(paymentId, amount.cents)
    return response.code === LEGACY_PAY_CODES.APPROVED ? { status: 'refunded' } : { status: 'rejected' }
  }
}
// #endregion

// #region tour:error-mapping
const chargeResultOf = (response: LegacyPayResponse): ChargeResult => {
  switch (response.code) {
    case LEGACY_PAY_CODES.INSUFFICIENT_FUNDS:
      return { status: 'declined', reason: 'insufficient-funds' }
    case LEGACY_PAY_CODES.EXPIRED_CARD:
      return { status: 'declined', reason: 'expired-card' }
    case LEGACY_PAY_CODES.ISSUER_UNAVAILABLE:
      return { status: 'unavailable' }
    default:
      return { status: 'approved', paymentId: response.reference }
  }
}
// #endregion
