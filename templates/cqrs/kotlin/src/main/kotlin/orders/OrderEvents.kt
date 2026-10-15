package orders

import kotlin.time.Instant

enum class OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }

sealed interface OrderEvent {
    val orderId: String
    val occurredAt: Instant
}

data class OrderPlaced(
    override val orderId: String,
    val customerEmail: String,
    val totalCents: Int,
    override val occurredAt: Instant,
) : OrderEvent

data class OrderPaid(override val orderId: String, val totalCents: Int, override val occurredAt: Instant) : OrderEvent

data class OrderShipped(override val orderId: String, override val occurredAt: Instant) : OrderEvent

data class OrderDelivered(override val orderId: String, override val occurredAt: Instant) : OrderEvent

data class OrderCancelled(override val orderId: String, override val occurredAt: Instant) : OrderEvent

val OrderEvent.statusAfter: OrderStatus
    get() =
        when (this) {
            is OrderPlaced -> OrderStatus.PENDING
            is OrderPaid -> OrderStatus.PAID
            is OrderShipped -> OrderStatus.SHIPPED
            is OrderDelivered -> OrderStatus.DELIVERED
            is OrderCancelled -> OrderStatus.CANCELLED
        }

fun interface Projection {
    fun apply(event: OrderEvent)
}
