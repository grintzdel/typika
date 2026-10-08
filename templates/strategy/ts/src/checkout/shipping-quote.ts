import { addMoney, type Money } from '../shop/money.ts'
import { subtotalOf, type Order } from '../shop/order.ts'
import type { ShippingCost } from './shipping-cost.ts'

export type Quote = {
  readonly subtotal: Money
  readonly shipping: Money
  readonly total: Money
}

// #region tour:context
export class ShippingQuote {
  private readonly shippingCost: ShippingCost

  constructor(shippingCost: ShippingCost) {
    this.shippingCost = shippingCost
  }

  for(order: Order): Quote {
    const subtotal = subtotalOf(order)
    const shipping = this.shippingCost.costFor(order)
    return { subtotal, shipping, total: addMoney(subtotal, shipping) }
  }
}
// #endregion
