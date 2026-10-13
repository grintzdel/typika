package pricing

import pricing.rules.bulkDiscount
import pricing.rules.memberDiscount
import shop.Order

// #region tour:rules
val DISCOUNT_RULES: List<DiscountRule> = listOf(memberDiscount, bulkDiscount)

fun discountsFor(order: Order, rules: List<DiscountRule> = DISCOUNT_RULES): List<Discount> {
    val subtotal = order.subtotal
    return rules.mapNotNull { it.discountFor(order, subtotal) }
}
// #endregion
