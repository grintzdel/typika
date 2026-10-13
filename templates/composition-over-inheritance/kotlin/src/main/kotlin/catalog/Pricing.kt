package catalog

import shop.Money

fun interface Pricing {
    fun priceOf(basePrice: Money): Money
}

val FullPrice = Pricing { basePrice -> basePrice }

fun discounted(percent: Int) = Pricing { basePrice -> basePrice.percentOff(percent) }
