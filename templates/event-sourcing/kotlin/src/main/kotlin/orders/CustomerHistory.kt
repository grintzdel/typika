package orders

data class CustomerOrderSummary(val orderCount: Int, val totalSpentCents: Int, val lastStatus: OrderStatus?)

private val NO_ORDERS = CustomerOrderSummary(orderCount = 0, totalSpentCents = 0, lastStatus = null)

private fun statusAfter(event: OrderEvent) =
    when (event) {
        is OrderPlaced -> OrderStatus.PENDING
        is OrderPaid -> OrderStatus.PAID
        is OrderShipped -> OrderStatus.SHIPPED
        is OrderDelivered -> OrderStatus.DELIVERED
        is OrderCancelled -> OrderStatus.CANCELLED
    }

private data class PlacedOrder(val customerEmail: String, val totalCents: Int)

private data class Tracked(val summary: CustomerOrderSummary, val lastOrderId: String)

class CustomerHistory {
    private val summaries = mutableMapOf<String, Tracked>()
    private val orders = mutableMapOf<String, PlacedOrder>()

    fun apply(event: OrderEvent) {
        if (event is OrderPlaced) {
            val email = event.customer.email
            val summary = forCustomer(email)
            orders[event.orderId] = PlacedOrder(email, event.totalCents)
            summaries[email] = Tracked(
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
                lastStatus = if (lastOrderId == event.orderId) statusAfter(event) else summary.lastStatus,
            ),
            lastOrderId,
        )
    }

    fun forCustomer(email: String) = summaries[email]?.summary ?: NO_ORDERS
}
