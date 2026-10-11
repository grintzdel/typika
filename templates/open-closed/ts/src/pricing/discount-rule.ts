import type { Money } from '../shop/money.ts'
import type { Order } from '../shop/order.ts'

// #region tour:extension-point
export type Discount = {
  readonly label: string
  readonly amount: Money
}

export interface DiscountRule {
  discountFor(order: Order, subtotal: Money): Discount | undefined
}
// #endregion
