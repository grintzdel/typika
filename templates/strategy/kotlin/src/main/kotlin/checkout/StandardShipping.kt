package checkout

import shop.Money
import shop.Order
import shop.eur

object StandardShipping : ShippingCost {
    override fun costFor(order: Order): Money = when {
        order.subtotal.isAtLeast(FREE_SHIPPING_THRESHOLD) -> Money.ZERO
        order.weightGrams > HEAVY_PARCEL_GRAMS -> eur(690)
        else -> eur(490)
    }
}
