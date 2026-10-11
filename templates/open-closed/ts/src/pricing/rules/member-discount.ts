import { percentOf, type Money } from '../../shop/money.ts'
import type { Order } from '../../shop/order.ts'
import type { Discount, DiscountRule } from '../discount-rule.ts'

const MEMBER_DISCOUNT_PERCENT = 10

export class MemberDiscount implements DiscountRule {
  discountFor(order: Order, subtotal: Money): Discount | undefined {
    if (order.customer.tier !== 'member') return undefined
    return {
      label: `Member discount (${MEMBER_DISCOUNT_PERCENT}%)`,
      amount: percentOf(subtotal, MEMBER_DISCOUNT_PERCENT),
    }
  }
}
