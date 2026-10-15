import app.ShopServices
import app.openShop
import orders.InMemoryOrderRepository
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

fun main() {
    val shop = openShop(
        ShopServices(
            orders = InMemoryOrderRepository(),
            stock = { lines -> println("  stock      reserved ${lines.joinToString { "${it.quantity} x ${it.sku}" }}") },
            notifier = { recipient, message -> println("  email      to $recipient: $message") },
            analytics = { event, properties -> println("  analytics  $event $properties") },
            loyalty = { customerEmail, points -> println("  loyalty    $points points for $customerEmail") },
        ),
    )

    println("Ada places an order")
    shop.placeOrder(
        Order(
            Customer("Ada", "ada@example.com", Tier.REGULAR),
            listOf(OrderLine("MUG-01", eur(1200), quantity = 2), OrderLine("TEA-GREEN", eur(850), quantity = 1)),
        ),
    )

    val endCampaign = shop.startLoyaltyCampaign()

    println("Grace places an order during a loyalty campaign")
    shop.placeOrder(
        Order(
            Customer("Grace", "grace@example.com", Tier.MEMBER),
            listOf(OrderLine("KETTLE-01", eur(5990), quantity = 1)),
        ),
    )

    endCampaign()
}
