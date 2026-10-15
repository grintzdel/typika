package app

import infrastructure.Email
import kotlin.test.Test
import kotlin.test.assertEquals

class NotificationsTest {
    @Test
    fun `emails a confirmation with the order total`() {
        val shop = openShop()

        shop.placeOrder(orderOf(ada, 3250))

        assertEquals(
            listOf(
                Email(
                    to = "ada@example.com",
                    subject = "Order order-1 confirmed",
                    body = "Hello Ada, we received your order of 32.50 EUR.",
                ),
            ),
            shop.mailer.sent,
        )
    }

    @Test
    fun `emails the customer when the order ships`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/pay", mapOf("cardToken" to "tok_visa"))

        shop.post("/orders/$orderId/ship")

        assertEquals(
            Email(
                to = "ada@example.com",
                subject = "Order order-1 shipped",
                body = "Hello Ada, your order is on its way.",
            ),
            shop.mailer.sent.last(),
        )
    }

    @Test
    fun `emails the reason when the order is cancelled`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))

        shop.post("/orders/$orderId/cancel", mapOf("reason" to "ordered twice"))

        assertEquals(
            Email(
                to = "ada@example.com",
                subject = "Order order-1 cancelled",
                body = "Hello Ada, your order was cancelled: ordered twice.",
            ),
            shop.mailer.sent.lastOrNull(),
        )
    }
}
