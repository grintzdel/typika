package checkout

import shop.Money
import shop.Order

object ExpressShipping : ShippingCost {
    override fun costFor(order: Order): Money = Money.ZERO
}
