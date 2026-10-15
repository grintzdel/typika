package app

import infrastructure.Message
import kotlin.test.Test
import kotlin.test.assertEquals

class OrderEventsTest {
    @Test
    fun `publishes OrderPlaced with the order total`() {
        val shop = openShop()

        shop.placeOrder(orderOf(ada, 3250))

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
    fun `publishes an event for each step of the order`() {
        val shop = openShop()
        val delivered = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$delivered/pay", mapOf("cardToken" to "tok_visa"))
        shop.post("/orders/$delivered/ship")
        shop.post("/orders/$delivered/deliver")
        val cancelled = shop.placeOrder(orderOf(ada, 1000))
        shop.post("/orders/$cancelled/cancel", mapOf("reason" to "ordered twice"))

        assertEquals(
            listOf("OrderPlaced", "OrderPaid", "OrderShipped", "OrderDelivered", "OrderPlaced", "OrderCancelled"),
            shop.broker.published.map { it.topic },
        )
    }
}
