package pricing.rules

import pricing.Discount
import pricing.DiscountRule
import shop.Tier

private const val MEMBER_DISCOUNT_PERCENT = 10

val memberDiscount = DiscountRule { order, subtotal ->
    if (order.customer.tier != Tier.MEMBER) {
        null
    } else {
        Discount("Member discount ($MEMBER_DISCOUNT_PERCENT%)", subtotal.percent(MEMBER_DISCOUNT_PERCENT))
    }
}
