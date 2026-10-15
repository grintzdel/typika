package app

import web.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals

private fun dayOf(day: String, salesCents: Int, refundsCents: Int) =
    mapOf("day" to day, "salesCents" to salesCents, "refundsCents" to refundsCents)

class DailyRevenueTest {
    private val visa = mapOf("cardToken" to "tok_visa")

    @Test
    fun `adds each payment to the day it was paid, not the day it was placed`() {
        val shop = openShop()
        val first = shop.placeOrder(orderOf(ada, 3250))
        shop.clock.advanceDays(1)
        shop.post("/orders/$first/pay", visa)
        val second = shop.placeOrder(orderOf(grace, 1000))
        shop.post("/orders/$second/pay", visa)
        shop.placeOrder(orderOf(ada, 500))

        assertEquals(
            HttpResponse(200, mapOf("days" to listOf(dayOf("2026-10-02", 4250, 0)))),
            shop.get("/revenue/daily"),
        )
    }

    @Test
    fun `counts a refund on the day the paid order is cancelled`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/pay", visa)
        shop.clock.advanceDays(2)
        shop.post("/orders/$orderId/cancel", mapOf("reason" to "changed my mind"))

        assertEquals(
            mapOf("days" to listOf(dayOf("2026-10-01", 3250, 0), dayOf("2026-10-03", 0, 3250))),
            shop.get("/revenue/daily").body,
        )
    }

    @Test
    fun `shows nothing for an order cancelled before it was paid`() {
        val shop = openShop()
        val orderId = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$orderId/cancel", mapOf("reason" to "ordered twice"))

        assertEquals(mapOf("days" to emptyList<Any>()), shop.get("/revenue/daily").body)
    }
}
