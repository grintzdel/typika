import type { Card, DeclineReason, PaymentGateway } from '../payments/payment-gateway.ts'
import type { Money } from '../shop/money.ts'
import { totalOf, type Order } from '../shop/order.ts'

export type PaymentOutcome =
  | { readonly status: 'paid'; readonly paymentId: string; readonly amount: Money }
  | { readonly status: 'declined'; readonly message: string }
  | { readonly status: 'retry-later' }

const DECLINE_MESSAGES: Record<DeclineReason, string> = {
  'insufficient-funds': 'Your card was declined: insufficient funds.',
  'expired-card': 'Your card has expired.',
  refused: 'Your card was declined.',
}

// #region tour:client
export class Checkout {
  private readonly payments: PaymentGateway

  constructor(payments: PaymentGateway) {
    this.payments = payments
  }

  pay(order: Order, card: Card): PaymentOutcome {
    const amount = totalOf(order)
    const result = this.payments.charge(amount, card)

    switch (result.status) {
      case 'approved':
        return { status: 'paid', paymentId: result.paymentId, amount }
      case 'declined':
        return { status: 'declined', message: DECLINE_MESSAGES[result.reason] }
      case 'unavailable':
        return { status: 'retry-later' }
    }
  }
}
// #endregion
