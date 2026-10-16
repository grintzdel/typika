package infrastructure

import orders.OrderState
import kotlin.time.Instant

data class OrderLineRow(val sku: String, val unitPriceCents: Int, val quantity: Int)

// #region tour:row
data class OrderRow(
    val id: String,
    val customerEmail: String,
    val customerName: String,
    val lines: List<OrderLineRow>,
    val totalCents: Int,
    val placedAt: Instant,
    var chargeId: String? = null,
    var state: OrderState = OrderState.Pending,
)
// #endregion

class InMemoryDatabase {
    val orders = mutableMapOf<String, OrderRow>()
    private var lastOrderId = 0

    fun nextOrderId(): String {
        lastOrderId += 1
        return "order-$lastOrderId"
    }
}
