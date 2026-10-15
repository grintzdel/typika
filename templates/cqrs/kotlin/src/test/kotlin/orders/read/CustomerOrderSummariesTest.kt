package orders.read

import orders.OrderPaid
import orders.OrderPlaced
import orders.OrderStatus
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Instant

private val occurredAt = Instant.parse("2026-10-01T09:00:00Z")

private fun placed(orderId: String, totalCents: Int) = OrderPlaced(orderId, "ada@example.com", totalCents, occurredAt)

private fun paid(orderId: String, totalCents: Int) = OrderPaid(orderId, totalCents, occurredAt)

class CustomerOrderSummariesTest {
    @Test
    fun `builds a summary from events alone, without reading any order`() {
        val summaries = CustomerOrderSummaries()

        summaries.apply(placed("order-1", 3250))
        summaries.apply(paid("order-1", 3250))

        assertEquals(
            CustomerOrderSummary(orderCount = 1, totalSpentCents = 3250, lastStatus = OrderStatus.PAID),
            summaries.forCustomer("ada@example.com"),
        )
    }

    @Test
    fun `shows the status of the latest order, whatever happens to older ones`() {
        val summaries = CustomerOrderSummaries()

        summaries.apply(placed("order-1", 3250))
        summaries.apply(placed("order-2", 1000))
        summaries.apply(paid("order-1", 3250))

        assertEquals(OrderStatus.PENDING, summaries.forCustomer("ada@example.com").lastStatus)
    }
}
