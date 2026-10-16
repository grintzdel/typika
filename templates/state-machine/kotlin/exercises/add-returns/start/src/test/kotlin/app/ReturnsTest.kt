package app

import web.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals

class ReturnsTest {
    private fun Shop.deliveredOrder(): String {
        val orderId = placeOrder(orderOf(ada, 3250))
        post("/orders/$orderId/pay", mapOf("cardToken" to "tok_visa"))
        post("/orders/$orderId/ship")
        post("/orders/$orderId/deliver")
        return orderId
    }

    @Test
    fun `takes back a delivered order within 14 days and refunds it`() {
        val shop = openShop()
        val orderId = shop.deliveredOrder()
        shop.clock.advanceDays(14)

        assertEquals(
            HttpResponse(200, mapOf("orderId" to orderId, "status" to "returned")),
            shop.post("/orders/$orderId/return"),
        )
        assertEquals("returned", shop.statusOf(orderId))
        assertEquals(listOf("ch_1"), shop.cards.refunded)
    }

    @Test
    fun `refuses a return after 14 days`() {
        val shop = openShop()
        val orderId = shop.deliveredOrder()
        shop.clock.advanceDays(15)

        assertEquals(409, shop.post("/orders/$orderId/return").status)
        assertEquals("delivered", shop.statusOf(orderId))
        assertEquals(emptyList(), shop.cards.refunded)
    }

    @Test
    fun `refuses to return an order that was not delivered`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/pay", mapOf("cardToken" to "tok_visa"))
        shop.post("/orders/$orderId/ship")

        assertEquals(409, shop.post("/orders/$orderId/return").status)
        assertEquals("shipped", shop.statusOf(orderId))
    }

    @Test
    fun `accepts nothing more once an order is returned`() {
        val shop = openShop()
        val orderId = shop.deliveredOrder()
        shop.post("/orders/$orderId/return")

        assertEquals(409, shop.post("/orders/$orderId/return").status)
        assertEquals(409, shop.post("/orders/$orderId/cancel", mapOf("reason" to "too late")).status)
        assertEquals(409, shop.post("/orders/$orderId/deliver").status)
        assertEquals(listOf("ch_1"), shop.cards.refunded)
    }
}
