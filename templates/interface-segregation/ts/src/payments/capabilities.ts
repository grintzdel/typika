import type { Money } from '../shop/money.ts'
import type { CardToken, Payment } from './payment.ts'

// #region tour:split
export interface Chargeable {
  charge(amount: Money): Payment
}

export interface Refundable {
  refund(payment: Payment): void
}

export interface CardVault {
  saveCard(customerEmail: string, cardNumber: string): CardToken
}

export interface RecurringPayments {
  subscribe(card: CardToken, monthlyFee: Money): void
}
// #endregion
