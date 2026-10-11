import { percentOf, type Money } from '../../shop/money.ts'
import type { Order } from '../../shop/order.ts'
import type { Discount, DiscountRule } from '../discount-rule.ts'

const BLACK_FRIDAY = '2026-11-27'
const BLACK_FRIDAY_PERCENT = 20

export class BlackFriday implements DiscountRule {
  discountFor(order: Order, subtotal: Money): Discount | undefined {
    if (order.placedOn !== BLACK_FRIDAY) return undefined
    return { label: `Black Friday (${BLACK_FRIDAY_PERCENT}%)`, amount: percentOf(subtotal, BLACK_FRIDAY_PERCENT) }
  }
}
