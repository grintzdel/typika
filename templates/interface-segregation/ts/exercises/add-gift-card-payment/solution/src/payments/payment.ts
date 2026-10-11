import type { Money } from '../shop/money.ts'

export type PaymentMethod = 'card' | 'bank-transfer' | 'gift-card'

export type Payment = {
  readonly id: string
  readonly method: PaymentMethod
  readonly amount: Money
}

export type CardToken = string
