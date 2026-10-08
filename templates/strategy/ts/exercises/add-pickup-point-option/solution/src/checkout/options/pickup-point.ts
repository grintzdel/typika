import { isAtLeast, money, ZERO, type Money } from '../../shop/money.ts'
import { subtotalOf, type Order } from '../../shop/order.ts'
import type { ShippingCost } from '../shipping-cost.ts'

const PICKUP_POINT_FREE_THRESHOLD = money(2500)

export class PickupPointShipping implements ShippingCost {
  costFor(order: Order): Money {
    if (order.customer.tier === 'member') return ZERO
    if (isAtLeast(subtotalOf(order), PICKUP_POINT_FREE_THRESHOLD)) return ZERO
    return money(290)
  }
}
