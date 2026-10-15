package loyalty

import infrastructure.Message
import kotlin.test.Test
import kotlin.test.assertEquals

private fun orderPlaced(orderId: String, totalCents: Int) =
    Message(
        "OrderPlaced",
        mapOf("orderId" to orderId, "customerEmail" to "ada@example.com", "totalCents" to totalCents),
    )

class LoyaltyPointsTest {
    @Test
    fun `awards one point per whole euro of each order`() {
        val loyalty = LoyaltyPoints()

        loyalty.handle(orderPlaced("order-1", 3250))
        loyalty.handle(orderPlaced("order-2", 1000))

        assertEquals(42, loyalty.pointsOf("ada@example.com"))
    }

    @Test
    fun `awards the points of an order once, however many times it is delivered`() {
        val loyalty = LoyaltyPoints()

        loyalty.handle(orderPlaced("order-1", 3250))
        loyalty.handle(orderPlaced("order-1", 3250))

        assertEquals(32, loyalty.pointsOf("ada@example.com"))
    }
}
