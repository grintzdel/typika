import { isAtLeast, money, ZERO, type Money } from '../../shop/money.ts'
import { subtotalOf, weightOf, type Order } from '../../shop/order.ts'
import type { ShippingCost } from '../shipping-cost.ts'
import { FREE_SHIPPING_THRESHOLD, HEAVY_PARCEL_GRAMS } from '../shipping-rules.ts'

export class ExpressShipping implements ShippingCost {
  costFor(order: Order): Money {
    const isMember = order.customer.tier === 'member'
    if (isMember && isAtLeast(subtotalOf(order), FREE_SHIPPING_THRESHOLD)) return ZERO
    return weightOf(order) > HEAVY_PARCEL_GRAMS ? money(1890) : money(1290)
  }
}
