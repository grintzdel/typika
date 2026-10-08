package checkout

import shop.Money
import shop.Order
import shop.Tier
import shop.eur

private val PICKUP_POINT_FREE_THRESHOLD = eur(2500)

object PickupPointShipping : ShippingCost {
    override fun costFor(order: Order): Money = when {
        order.customer.tier == Tier.MEMBER -> Money.ZERO
        order.subtotal.isAtLeast(PICKUP_POINT_FREE_THRESHOLD) -> Money.ZERO
        else -> eur(290)
    }
}
