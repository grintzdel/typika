package checkout

import shop.Money
import shop.Order
import shop.Tier
import shop.eur

object ExpressShipping : ShippingCost {
    override fun costFor(order: Order): Money {
        val isMember = order.customer.tier == Tier.MEMBER
        return when {
            isMember && order.subtotal.isAtLeast(FREE_SHIPPING_THRESHOLD) -> Money.ZERO
            order.weightGrams > HEAVY_PARCEL_GRAMS -> eur(1890)
            else -> eur(1290)
        }
    }
}
