package pricing.rules

import pricing.Discount
import pricing.DiscountRule

private const val BLACK_FRIDAY = "2026-11-27"
private const val BLACK_FRIDAY_PERCENT = 20

val blackFriday = DiscountRule { order, subtotal ->
    if (order.placedOn != BLACK_FRIDAY) {
        null
    } else {
        Discount("Black Friday ($BLACK_FRIDAY_PERCENT%)", subtotal.percent(BLACK_FRIDAY_PERCENT))
    }
}
