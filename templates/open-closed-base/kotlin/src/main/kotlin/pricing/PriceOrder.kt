package pricing

import shop.Money
import shop.Order
import shop.Tier
import shop.eur

const val MEMBER_DISCOUNT_PERCENT = 10
val BULK_DISCOUNT_FROM = eur(10000)
val BULK_DISCOUNT = eur(500)

fun totalOf(order: Order): Money {
    val subtotal = order.subtotal
    var total = subtotal

    when (order.customer.tier) {
        Tier.MEMBER -> total -= subtotal.percent(MEMBER_DISCOUNT_PERCENT)
        Tier.REGULAR -> {}
    }

    if (subtotal.isAtLeast(BULK_DISCOUNT_FROM)) {
        total -= BULK_DISCOUNT
    }

    return total
}
