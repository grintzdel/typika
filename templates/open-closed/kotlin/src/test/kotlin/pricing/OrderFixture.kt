package pricing

import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

val ada = Customer("Ada", "ada@example.com", Tier.REGULAR)

val grace = Customer("Grace", "grace@example.com", Tier.MEMBER)

fun orderOf(customer: Customer, subtotalCents: Long, placedOn: String = "2026-11-20") =
    Order(customer, listOf(OrderLine("TEST-SKU", eur(subtotalCents), 1)), placedOn)
