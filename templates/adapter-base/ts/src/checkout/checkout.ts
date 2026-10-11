import type { Money } from '../shop/money.ts'
import { totalOf, type Order } from '../shop/order.ts'
import { LEGACY_PAY_CODES, type LegacyPayClient } from '../vendor/legacy-pay/legacy-pay-client.ts'

export type Card = {
  readonly token: string
}

export type PaymentOutcome =
  | { readonly status: 'paid'; readonly paymentId: string; readonly amount: Money }
  | { readonly status: 'declined'; readonly message: string }
  | { readonly status: 'retry-later' }

const EUR_NUMERIC_CODE = 978

export class Checkout {
  private readonly client: LegacyPayClient

  constructor(client: LegacyPayClient) {
    this.client = client
  }

  pay(order: Order, card: Card): PaymentOutcome {
    const amount = totalOf(order)
    const response = this.client.makePayment(amount.cents, EUR_NUMERIC_CODE, card.token)

    switch (response.code) {
      case LEGACY_PAY_CODES.APPROVED:
        return { status: 'paid', paymentId: response.reference, amount }
      case LEGACY_PAY_CODES.INSUFFICIENT_FUNDS:
        return { status: 'declined', message: 'Your card was declined: insufficient funds.' }
      case LEGACY_PAY_CODES.EXPIRED_CARD:
        return { status: 'declined', message: 'Your card has expired.' }
      case LEGACY_PAY_CODES.ISSUER_UNAVAILABLE:
        return { status: 'retry-later' }
      default:
        return { status: 'declined', message: 'Your card was declined.' }
    }
  }
}
