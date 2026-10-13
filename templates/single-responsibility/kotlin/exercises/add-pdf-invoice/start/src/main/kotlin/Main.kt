import orders.InMemoryOrderRepository
import orders.OrderService
import services.Notifier
import services.PdfWriter
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

fun main() {
    val orderService = OrderService(
        orders = InMemoryOrderRepository(),
        notifier = Notifier { recipient, message -> println("email to $recipient\n$message\n") },
        pdf = PdfWriter { document ->
            println("pdf $document\n")
            ByteArray(0)
        },
    )

    val ada = orderService.placeOrder(
        Order(
            Customer("Ada", "ada@example.com", Tier.REGULAR),
            listOf(OrderLine("MUG-01", eur(1200), quantity = 2), OrderLine("TEA-GREEN", eur(850), quantity = 1)),
        ),
    )
    println("${ada.orderId} placed, ${ada.total} to pay\n")

    val grace = orderService.placeOrder(
        Order(
            Customer("Grace", "grace@example.com", Tier.MEMBER),
            listOf(OrderLine("KETTLE-01", eur(5990), quantity = 1)),
        ),
    )
    println("${grace.orderId} placed, ${grace.total} to pay")
}
