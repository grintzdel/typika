package orders

import kotlin.time.Instant

data class Customer(val name: String, val email: String)

data class OrderLine(val sku: String, val unitPriceCents: Int, val quantity: Int)

// #region tour:events
sealed interface OrderEvent {
    val orderId: String
    val occurredAt: Instant
}

data class OrderPlaced(
    override val orderId: String,
    val customer: Customer,
    val lines: List<OrderLine>,
    val totalCents: Int,
    override val occurredAt: Instant,
) : OrderEvent

data class OrderPaid(
    override val orderId: String,
    val chargeId: String,
    val totalCents: Int,
    override val occurredAt: Instant,
) : OrderEvent

data class OrderShipped(override val orderId: String, override val occurredAt: Instant) : OrderEvent

data class OrderDelivered(override val orderId: String, override val occurredAt: Instant) : OrderEvent

data class OrderCancelled(override val orderId: String, val reason: String, override val occurredAt: Instant) :
    OrderEvent
// #endregion
