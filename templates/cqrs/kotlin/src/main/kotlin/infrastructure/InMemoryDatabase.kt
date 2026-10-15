package infrastructure

import kotlin.time.Instant

data class OrderLineRow(val sku: String, val unitPriceCents: Int, val quantity: Int)

data class OrderRow(
    val id: String,
    val customerEmail: String,
    val customerName: String,
    val lines: List<OrderLineRow>,
    val totalCents: Int,
    val placedAt: Instant,
    var chargeId: String? = null,
    var deliveredAt: Instant? = null,
    var isPaid: Boolean = false,
    var isShipped: Boolean = false,
    var isDelivered: Boolean = false,
    var isCancelled: Boolean = false,
)

class InMemoryDatabase {
    val orders = mutableMapOf<String, OrderRow>()
    private var lastOrderId = 0

    fun nextOrderId(): String {
        lastOrderId += 1
        return "order-$lastOrderId"
    }
}
