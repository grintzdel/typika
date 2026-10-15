package orders

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Instant

private fun at(day: Int) = Instant.parse("2026-10-0${day}T09:00:00Z")

private val ada = Customer("Ada", "ada@example.com")

private val history = listOf(
    OrderPlaced("order-1", ada, listOf(OrderLine("MUG-01", 1200, 2)), 2400, at(1)),
    OrderPaid("order-1", chargeId = "ch_1", totalCents = 2400, occurredAt = at(2)),
)

class OrderTest {
    @Test
    fun `rebuilds an order by replaying its events`() {
        assertEquals(Order("order-1", ada, 2400, OrderStatus.PAID, chargeId = "ch_1"), rehydrate(history))
    }

    @Test
    fun `records why and when an order was cancelled`() {
        val decision = decide(rehydrate(history), CancelOrder("ordered twice"), at(3))

        assertEquals(Decision.Accepted(listOf(OrderCancelled("order-1", "ordered twice", at(3)))), decision)
    }
}
