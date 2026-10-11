import type { Money } from '../shop/money.ts'

export type Card = {
  readonly token: string
}

export type DeclineReason = 'insufficient-funds' | 'expired-card' | 'refused'

export type ChargeResult =
  | { readonly status: 'approved'; readonly paymentId: string }
  | { readonly status: 'declined'; readonly reason: DeclineReason }
  | { readonly status: 'unavailable' }

export type RefundResult = { readonly status: 'refunded' } | { readonly status: 'rejected' }

// #region tour:target
export interface PaymentGateway {
  charge(amount: Money, card: Card): ChargeResult
  refund(paymentId: string, amount: Money): RefundResult
}
// #endregion
