package checkout

import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

val order = Order(
    Customer("Ada", Tier.REGULAR),
    listOf(OrderLine("MUG-01", eur(1200), quantity = 2), OrderLine("TEA-GREEN", eur(850), quantity = 1)),
)
