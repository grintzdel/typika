import shipping.CarrierName
import shipping.SequentialTrackingNumbers
import shipping.ShippingDesk
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier

private val orders = listOf(
    Order(Customer("Ada", Tier.REGULAR), listOf(OrderLine("MUG-01", quantity = 2, unitWeightGrams = 400))),
    Order(Customer("Grace", Tier.MEMBER), listOf(OrderLine("BOOKSHELF-01", quantity = 1, unitWeightGrams = 18_000))),
)

fun main() {
    val desk = ShippingDesk(SequentialTrackingNumbers())

    for (order in orders) {
        println("${order.customer.name}'s order")
        for (carrier in CarrierName.entries) {
            val name = carrier.label.padEnd(10)
            try {
                val shipment = desk.ship(order, carrier)
                val days = if (shipment.deliveryDays == 1) "1 day" else "${shipment.deliveryDays} days"
                println("  $name ${shipment.label}, delivered in $days")
            } catch (error: IllegalArgumentException) {
                println("  $name refused: ${error.message}")
            }
        }
    }
}
