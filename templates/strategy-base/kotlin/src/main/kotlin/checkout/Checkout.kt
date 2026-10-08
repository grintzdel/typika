package checkout

import shop.Money
import shop.Order
import shop.Tier
import shop.eur

fun quoteShipping(order: Order, option: ShippingOption): Quote {
    val subtotal = order.subtotal
    val shipping = shippingCost(order, subtotal, option)
    return Quote(subtotal, shipping, subtotal + shipping)
}

private fun shippingCost(order: Order, subtotal: Money, option: ShippingOption): Money {
    val isMember = order.customer.tier == Tier.MEMBER
    val freeShipping = option == ShippingOption.STANDARD || isMember
    if (freeShipping && subtotal.isAtLeast(FREE_SHIPPING_THRESHOLD)) return Money.ZERO

    val isHeavy = order.weightGrams > HEAVY_PARCEL_GRAMS
    return if (option == ShippingOption.EXPRESS) {
        if (isHeavy) eur(1890) else eur(1290)
    } else {
        if (isHeavy) eur(690) else eur(490)
    }
}
