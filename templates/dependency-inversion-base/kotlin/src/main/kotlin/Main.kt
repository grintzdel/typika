import app.openShop
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur

fun main() {
    val shop = openShop()

    shop.checkout.placeOrder(
        Order(
            Customer("Ada", "ada@example.com", Tier.REGULAR),
            listOf(OrderLine("MUG-01", eur(1200), quantity = 2), OrderLine("TEA-GREEN", eur(850), quantity = 1)),
        ),
    )
    shop.checkout.placeOrder(
        Order(
            Customer("Grace", "grace@example.com", Tier.MEMBER),
            listOf(OrderLine("KETTLE-01", eur(5990), quantity = 1)),
        ),
    )
}
