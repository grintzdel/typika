import checkout.ShippingOption
import checkout.quoteShipping
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

private val orders = listOf(
    Order(
        Customer("Ada", Tier.REGULAR),
        listOf(
            OrderLine("MUG-01", eur(1200), quantity = 2, unitWeightGrams = 400),
            OrderLine("TEA-GREEN", eur(850), quantity = 1, unitWeightGrams = 250),
        ),
    ),
    Order(
        Customer("Grace", Tier.MEMBER),
        listOf(OrderLine("KETTLE-01", eur(5900), quantity = 1, unitWeightGrams = 2400)),
    ),
)

fun main() {
    for (order in orders) {
        val tenthsOfKg = (order.weightGrams + 50) / 100
        val weightKg = "${tenthsOfKg / 10}.${tenthsOfKg % 10}"
        println("${order.customer.name} (${order.customer.tier.name.lowercase()}): $weightKg kg, subtotal ${order.subtotal}")
        for (option in ShippingOption.entries) {
            val quote = quoteShipping(order, option)
            println("  ${option.label.padEnd(12)} shipping ${quote.shipping.toString().padStart(10)}   total ${quote.total.toString().padStart(10)}")
        }
    }
}
