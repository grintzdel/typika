package app

import web.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals

class OrderLifecycleTest {
    private val visa = mapOf("cardToken" to "tok_visa")
    private val orderedTwice = mapOf("reason" to "ordered twice")

    @Test
    fun `pays an order with an accepted card`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))

        val response = shop.post("/orders/$orderId/pay", visa)

        assertEquals(HttpResponse(200, mapOf("orderId" to orderId, "status" to "paid")), response)
    }

    @Test
    fun `keeps the order pending when the card is declined`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))

        val response = shop.post("/orders/$orderId/pay", mapOf("cardToken" to "tok_refused"))

        assertEquals(402, response.status)
        assertEquals("pending", shop.statusOf(orderId))
    }

    @Test
    fun `refuses to ship an order that is not paid`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))

        assertEquals(409, shop.post("/orders/$orderId/ship").status)
        assertEquals("pending", shop.statusOf(orderId))
    }

    @Test
    fun `ships then delivers a paid order`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/pay", visa)

        assertEquals("shipped", shop.post("/orders/$orderId/ship").body["status"])
        assertEquals("delivered", shop.post("/orders/$orderId/deliver").body["status"])
    }

    @Test
    fun `cancels a pending order without refunding anything`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))

        assertEquals("cancelled", shop.post("/orders/$orderId/cancel", orderedTwice).body["status"])
        assertEquals(emptyList(), shop.cards.refunded)
    }

    @Test
    fun `refunds a paid order when it is cancelled`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/pay", visa)

        shop.post("/orders/$orderId/cancel", orderedTwice)

        assertEquals(listOf("ch_1"), shop.cards.refunded)
    }

    @Test
    fun `refuses to cancel an order that has shipped`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/pay", visa)
        shop.post("/orders/$orderId/ship")

        assertEquals(409, shop.post("/orders/$orderId/cancel", mapOf("reason" to "too late")).status)
        assertEquals("shipped", shop.statusOf(orderId))
    }

    @Test
    fun `refuses to pay a cancelled order`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/cancel", orderedTwice)

        assertEquals(409, shop.post("/orders/$orderId/pay", visa).status)
    }

    @Test
    fun `answers 404 for an unknown order`() {
        assertEquals(404, openShop().post("/orders/order-9/pay", visa).status)
    }
}
