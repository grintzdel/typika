import { isAtLeast, money, ZERO, type Money } from '../../shop/money.ts'
import { subtotalOf, weightOf, type Order } from '../../shop/order.ts'
import type { ShippingCost } from '../shipping-cost.ts'
import { FREE_SHIPPING_THRESHOLD, HEAVY_PARCEL_GRAMS } from '../shipping-rules.ts'

export class StandardShipping implements ShippingCost {
  costFor(order: Order): Money {
    if (isAtLeast(subtotalOf(order), FREE_SHIPPING_THRESHOLD)) return ZERO
    return weightOf(order) > HEAVY_PARCEL_GRAMS ? money(690) : money(490)
  }
}
