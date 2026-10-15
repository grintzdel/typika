package app

import web.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals

class OrderTimelineTest {
    @Test
    fun `lists what happened to an order, when, and why it was cancelled`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.clock.advanceDays(1)
        shop.post("/orders/$orderId/pay", mapOf("cardToken" to "tok_visa"))
        shop.clock.advanceDays(2)
        shop.post("/orders/$orderId/cancel", mapOf("reason" to "ordered twice"))

        assertEquals(
            HttpResponse(
                200,
                mapOf(
                    "timeline" to listOf(
                        mapOf("event" to "OrderPlaced", "at" to "2026-10-01T09:00:00Z"),
                        mapOf("event" to "OrderPaid", "at" to "2026-10-02T09:00:00Z"),
                        mapOf("event" to "OrderCancelled", "at" to "2026-10-04T09:00:00Z", "reason" to "ordered twice"),
                    ),
                ),
            ),
            shop.get("/orders/$orderId/timeline"),
        )
    }

    @Test
    fun `leaves out the actions the shop refused`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/ship")
        shop.post("/orders/$orderId/pay", mapOf("cardToken" to "tok_refused"))

        assertEquals(
            mapOf("timeline" to listOf(mapOf("event" to "OrderPlaced", "at" to "2026-10-01T09:00:00Z"))),
            shop.get("/orders/$orderId/timeline").body,
        )
    }

    @Test
    fun `answers 404 for an unknown order`() {
        assertEquals(404, openShop().get("/orders/order-9/timeline").status)
    }
}
