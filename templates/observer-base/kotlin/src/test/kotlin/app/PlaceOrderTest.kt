package app

import shop.Order
import shop.OrderLine
import shop.ada
import shop.eur
import shop.grace
import shop.orderOf
import kotlin.test.Test
import kotlin.test.assertEquals

class PlaceOrderTest {
    @Test
    fun `gives every order its own id`() {
        val shop = FakeServices().open()

        assertEquals("order-1", shop.placeOrder(orderOf(ada, 1000)))
        assertEquals("order-2", shop.placeOrder(orderOf(grace, 2000)))
    }

    @Test
    fun `reserves the stock of every line`() {
        val services = FakeServices()
        val order = Order(ada, listOf(OrderLine("MUG-01", eur(1200), 2), OrderLine("TEA-GREEN", eur(850), 1)))

        services.open().placeOrder(order)

        assertEquals(listOf(order.lines), services.stock.reserved)
    }

    @Test
    fun `emails the customer a confirmation with the order total`() {
        val services = FakeServices()

        services.open().placeOrder(orderOf(grace, 5990))

        assertEquals(listOf(Email("grace@example.com", "Order order-1 confirmed: 59.90 EUR")), services.notifier.sent)
    }

    @Test
    fun `tracks the sale in analytics`() {
        val services = FakeServices()

        services.open().placeOrder(orderOf(ada, 3250))

        val expected = Tracked("order_placed", mapOf("orderId" to "order-1", "totalCents" to 3250L))
        assertEquals(listOf(expected), services.analytics.tracked)
    }

    @Test
    fun `reacts once to each order`() {
        val services = FakeServices()
        val shop = services.open()

        shop.placeOrder(orderOf(ada, 1000))
        shop.placeOrder(orderOf(grace, 2000))

        assertEquals(2, services.stock.reserved.size)
        assertEquals(2, services.notifier.sent.size)
        assertEquals(2, services.analytics.tracked.size)
    }
}
