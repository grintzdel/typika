import type { Money } from '../shop/money.ts'
import type { CardToken, Payment } from './payment.ts'

export interface PaymentGateway {
  charge(amount: Money): Payment
  refund(payment: Payment): void
  saveCard(customerEmail: string, cardNumber: string): CardToken
  subscribe(card: CardToken, monthlyFee: Money): void
}
