package checkout

import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

fun orderOf(subtotalCents: Long, weightGrams: Int, tier: Tier = Tier.REGULAR) = Order(
    Customer("Test customer", tier),
    listOf(OrderLine("TEST-SKU", eur(subtotalCents), quantity = 1, unitWeightGrams = weightGrams)),
)
