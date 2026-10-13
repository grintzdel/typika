import receipts.receiptFor
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

private val orders = listOf(
    Order(
        Customer("Ada", "ada@example.com", Tier.REGULAR),
        listOf(OrderLine("MUG-01", eur(1200), quantity = 2), OrderLine("TEA-GREEN", eur(850), quantity = 1)),
        placedOn = "2026-11-20",
    ),
    Order(
        Customer("Grace", "grace@example.com", Tier.MEMBER),
        listOf(OrderLine("KETTLE-01", eur(5990), quantity = 1), OrderLine("TEA-BLACK", eur(950), quantity = 5)),
        placedOn = "2026-11-27",
    ),
)

fun main() {
    for (order in orders) {
        println("${order.customer.name}, ${order.placedOn}\n${receiptFor(order)}\n")
    }
}
