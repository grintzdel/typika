package shipping

import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier

fun orderOf(weightGrams: Int, name: String = "Ada") =
    Order(Customer(name, Tier.REGULAR), listOf(OrderLine("TEST-SKU", quantity = 1, unitWeightGrams = weightGrams)))

fun openDesk() = ShippingDesk(SequentialTrackingNumbers())
