package app

import kotlin.test.Test
import kotlin.test.assertEquals

class CustomerHistoryTest {
    private val visa = mapOf("cardToken" to "tok_visa")

    @Test
    fun `counts the orders, sums what was spent and shows the last status`() {
        val shop = openShop()
        val first = shop.placeOrder(orderOf(ada, 3250))
        shop.post("/orders/$first/pay", visa)
        shop.placeOrder(orderOf(grace, 9900))
        val second = shop.placeOrder(orderOf(ada, 1000))
        shop.post("/orders/$second/pay", visa)

        assertEquals(
            mapOf("orderCount" to 2, "totalSpentCents" to 4250, "lastStatus" to "paid"),
            shop.get("/customers/ada@example.com/orders").body,
        )
    }

    @Test
    fun `leaves cancelled orders out of the amount spent`() {
        val shop = openShop()
        shop.placeOrder(orderOf(ada, 3250))
        val cancelled = shop.placeOrder(orderOf(ada, 1000))
        shop.post("/orders/$cancelled/cancel", mapOf("reason" to "ordered twice"))

        assertEquals(
            mapOf("orderCount" to 2, "totalSpentCents" to 3250, "lastStatus" to "cancelled"),
            shop.get("/customers/ada@example.com/orders").body,
        )
    }

    @Test
    fun `shows an empty history for a customer without orders`() {
        assertEquals(
            mapOf("orderCount" to 0, "totalSpentCents" to 0, "lastStatus" to null),
            openShop().get("/customers/ada@example.com/orders").body,
        )
    }
}
