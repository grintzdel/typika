import type { Money } from '../shop/money.ts'
import type { Order } from '../shop/order.ts'

// #region tour:contract
export interface ShippingCost {
  costFor(order: Order): Money
}
// #endregion
