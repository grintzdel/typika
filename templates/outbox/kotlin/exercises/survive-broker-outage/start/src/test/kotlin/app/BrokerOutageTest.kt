package app

import infrastructure.Message
import kotlin.test.Test
import kotlin.test.assertEquals

class BrokerOutageTest {
    @Test
    fun `places and confirms the order while the broker is down`() {
        val shop = openShop()
        shop.broker.goDown()

        val orderId = shop.placeOrder(orderOf(ada, 3250))

        assertEquals("pending", shop.statusOf(orderId))
        assertEquals(1, shop.mailer.sent.size)
    }

    @Test
    fun `publishes the missed event once the broker is back`() {
        val shop = openShop()
        shop.broker.goDown()
        shop.placeOrder(orderOf(ada, 3250))

        shop.broker.comeBack()
        shop.relay.publishPending()

        assertEquals(
            listOf(
                Message(
                    "OrderPlaced",
                    mapOf("orderId" to "order-1", "customerEmail" to "ada@example.com", "totalCents" to 3250),
                ),
            ),
            shop.broker.published,
        )
    }

    @Test
    fun `publishes missed events before new ones, and each one once`() {
        val shop = openShop()
        shop.broker.goDown()
        shop.placeOrder(orderOf(ada, 3250))
        shop.broker.comeBack()

        shop.placeOrder(orderOf(grace, 1000))
        shop.relay.publishPending()

        assertEquals(listOf("order-1", "order-2"), shop.broker.published.map { it.payload["orderId"] })
    }
}
