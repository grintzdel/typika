package shop

val ada = Customer("Ada", "ada@example.com", Tier.REGULAR)

val grace = Customer("Grace", "grace@example.com", Tier.MEMBER)

fun orderOf(customer: Customer, totalCents: Long) = Order(customer, listOf(OrderLine("TEST-SKU", eur(totalCents), 1)))
