import { subtotalOf, type Order } from '../shop/order.ts'
import type { Discount, DiscountRule } from './discount-rule.ts'
import { BlackFriday } from './rules/black-friday.ts'
import { BulkDiscount } from './rules/bulk-discount.ts'
import { MemberDiscount } from './rules/member-discount.ts'

// #region tour:rules
export const DISCOUNT_RULES: readonly DiscountRule[] = [new MemberDiscount(), new BulkDiscount(), new BlackFriday()]

export const discountsFor = (order: Order, rules = DISCOUNT_RULES): Discount[] => {
  const subtotal = subtotalOf(order)
  return rules.flatMap((rule) => rule.discountFor(order, subtotal) ?? [])
}
// #endregion
