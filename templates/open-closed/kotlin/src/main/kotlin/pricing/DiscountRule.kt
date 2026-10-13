package pricing

import shop.Money
import shop.Order

// #region tour:extension-point
data class Discount(val label: String, val amount: Money)

fun interface DiscountRule {
    fun discountFor(order: Order, subtotal: Money): Discount?
}
// #endregion
