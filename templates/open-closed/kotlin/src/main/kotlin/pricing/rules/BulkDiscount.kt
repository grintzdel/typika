package pricing.rules

import pricing.Discount
import pricing.DiscountRule
import shop.eur

private val BULK_DISCOUNT_FROM = eur(10000)
private val BULK_DISCOUNT = eur(500)

val bulkDiscount = DiscountRule { _, subtotal ->
    if (subtotal.isAtLeast(BULK_DISCOUNT_FROM)) Discount("Bulk discount", BULK_DISCOUNT) else null
}
