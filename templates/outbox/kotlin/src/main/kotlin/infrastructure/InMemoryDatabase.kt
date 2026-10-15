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

data class OutboxEntry(val id: Int, val topic: String, val payload: Map<String, Any?>, var published: Boolean = false)

class InMemoryDatabase {
    val orders = mutableMapOf<String, OrderRow>()
    val outbox = mutableListOf<OutboxEntry>()
    private var lastOrderId = 0

    fun nextOrderId(): String {
        lastOrderId += 1
        return "order-$lastOrderId"
    }

    fun addToOutbox(topic: String, payload: Map<String, Any?>) {
        outbox += OutboxEntry(outbox.size + 1, topic, payload)
    }

    // #region tour:transaction
    fun <T> transaction(work: () -> T): T {
        val savedOrders = orders.mapValues { (_, row) -> row.copy() }
        val outboxSize = outbox.size
        val savedLastOrderId = lastOrderId
        try {
            return work()
        } catch (error: Throwable) {
            orders.clear()
            orders.putAll(savedOrders)
            while (outbox.size > outboxSize) outbox.removeLast()
            lastOrderId = savedLastOrderId
            throw error
        }
    }
    // #endregion
}
