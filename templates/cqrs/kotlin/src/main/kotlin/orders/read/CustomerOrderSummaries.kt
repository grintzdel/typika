package orders.read

import orders.OrderCancelled
import orders.OrderEvent
import orders.OrderPlaced
import orders.OrderStatus
import orders.Projection
import orders.statusAfter

// #region tour:read-model
data class CustomerOrderSummary(val orderCount: Int, val totalSpentCents: Int, val lastStatus: OrderStatus?)

private val NO_ORDERS = CustomerOrderSummary(orderCount = 0, totalSpentCents = 0, lastStatus = null)
// #endregion

private data class PlacedOrder(val customerEmail: String, val totalCents: Int)

private data class Tracked(val summary: CustomerOrderSummary, val lastOrderId: String)

class CustomerOrderSummaries : Projection {
    private val summaries = mutableMapOf<String, Tracked>()
    private val orders = mutableMapOf<String, PlacedOrder>()

    // #region tour:projection
    override fun apply(event: OrderEvent) {
        if (event is OrderPlaced) {
            val summary = forCustomer(event.customerEmail)
            orders[event.orderId] = PlacedOrder(event.customerEmail, event.totalCents)
            summaries[event.customerEmail] = Tracked(
                CustomerOrderSummary(
                    orderCount = summary.orderCount + 1,
                    totalSpentCents = summary.totalSpentCents + event.totalCents,
                    lastStatus = OrderStatus.PENDING,
                ),
                lastOrderId = event.orderId,
            )
            return
        }
        val order = orders[event.orderId] ?: return
        val (summary, lastOrderId) = summaries[order.customerEmail] ?: return
        val refunded = if (event is OrderCancelled) order.totalCents else 0
        summaries[order.customerEmail] = Tracked(
            summary.copy(
                totalSpentCents = summary.totalSpentCents - refunded,
                lastStatus = if (lastOrderId == event.orderId) event.statusAfter else summary.lastStatus,
            ),
            lastOrderId,
        )
    }
    // #endregion

    fun forCustomer(email: String) = summaries[email]?.summary ?: NO_ORDERS
}
