import { money, type Money } from '../../shop/money.ts'
import type { Order } from '../../shop/order.ts'
import type { Discount, DiscountRule } from '../discount-rule.ts'

const BULK_DISCOUNT_FROM = money(10000)
const BULK_DISCOUNT = money(500)

export class BulkDiscount implements DiscountRule {
  discountFor(_order: Order, subtotal: Money): Discount | undefined {
    if (subtotal.cents < BULK_DISCOUNT_FROM.cents) return undefined
    return { label: 'Bulk discount', amount: BULK_DISCOUNT }
  }
}
