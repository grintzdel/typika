import type { Money } from '../shop/money.ts'

export interface GiftCards {
  redeem(amount: Money): string
}
