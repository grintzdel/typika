package orders

import kotlin.time.Instant

enum class OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }

data class Order(
    val id: String,
    val customer: Customer,
    val totalCents: Int,
    val status: OrderStatus,
    val chargeId: String? = null,
)

sealed interface OrderCommand

data class PlaceOrder(val orderId: String, val customer: Customer, val lines: List<OrderLine>) : OrderCommand

sealed interface OrderChange : OrderCommand

data class PayOrder(val chargeId: String) : OrderChange

data object ShipOrder : OrderChange

data object DeliverOrder : OrderChange

data class CancelOrder(val reason: String) : OrderChange

enum class Rejection { INVALID, NOT_FOUND, CONFLICT }

sealed interface Decision {
    data class Accepted(val events: List<OrderEvent>) : Decision

    data class Rejected(val rejection: Rejection, val reason: String) : Decision
}

private fun accept(event: OrderEvent) = Decision.Accepted(listOf(event))

private fun reject(rejection: Rejection, reason: String) = Decision.Rejected(rejection, reason)

private fun checkNewOrder(command: PlaceOrder): Decision.Rejected? {
    val (_, customer, lines) = command
    if (customer.name.isEmpty()) return reject(Rejection.INVALID, "A customer name is required")
    if ('@' !in customer.email) return reject(Rejection.INVALID, "A valid customer email is required")
    if (lines.isEmpty()) return reject(Rejection.INVALID, "An order needs at least one line")
    for (line in lines) {
        if (line.sku.isEmpty()) return reject(Rejection.INVALID, "Each line needs a sku")
        if (line.unitPriceCents <= 0 || line.quantity <= 0) {
            return reject(Rejection.INVALID, "Line ${line.sku} needs a positive whole price and quantity")
        }
    }
    return null
}

fun paymentRefusal(order: Order): Decision.Rejected? =
    when (order.status) {
        OrderStatus.PENDING -> null
        OrderStatus.CANCELLED -> reject(Rejection.CONFLICT, "Order ${order.id} is cancelled")
        OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED ->
            reject(Rejection.CONFLICT, "Order ${order.id} is already paid")
    }

// #region tour:decide
fun decide(order: Order?, command: OrderCommand, occurredAt: Instant): Decision =
    when (command) {
        is PlaceOrder ->
            if (order != null) {
                reject(Rejection.CONFLICT, "Order ${order.id} already exists")
            } else {
                val totalCents = command.lines.sumOf { it.unitPriceCents * it.quantity }
                checkNewOrder(command)
                    ?: accept(OrderPlaced(command.orderId, command.customer, command.lines, totalCents, occurredAt))
            }
        is OrderChange ->
            if (order == null) {
                reject(Rejection.NOT_FOUND, "Order not found")
            } else {
                decideChange(order, command, occurredAt)
            }
    }

private fun decideChange(order: Order, command: OrderChange, occurredAt: Instant): Decision {
    val orderId = order.id
    return when (command) {
        is PayOrder ->
            paymentRefusal(order) ?: accept(OrderPaid(orderId, command.chargeId, order.totalCents, occurredAt))
        ShipOrder ->
            when (order.status) {
                OrderStatus.PAID -> accept(OrderShipped(orderId, occurredAt))
                OrderStatus.PENDING -> reject(Rejection.CONFLICT, "Order $orderId is not paid")
                OrderStatus.CANCELLED -> reject(Rejection.CONFLICT, "Order $orderId is cancelled")
                OrderStatus.SHIPPED, OrderStatus.DELIVERED ->
                    reject(Rejection.CONFLICT, "Order $orderId has already shipped")
            }
        DeliverOrder ->
            if (order.status == OrderStatus.SHIPPED) {
                accept(OrderDelivered(orderId, occurredAt))
            } else {
                reject(Rejection.CONFLICT, "Order $orderId is not on its way")
            }
        is CancelOrder ->
            when (order.status) {
                OrderStatus.PENDING, OrderStatus.PAID -> accept(OrderCancelled(orderId, command.reason, occurredAt))
                OrderStatus.SHIPPED, OrderStatus.DELIVERED ->
                    reject(Rejection.CONFLICT, "Order $orderId has already shipped")
                OrderStatus.CANCELLED -> reject(Rejection.CONFLICT, "Order $orderId is already cancelled")
            }
    }
}
// #endregion

// #region tour:rehydration
fun evolve(order: Order?, event: OrderEvent): Order =
    when (event) {
        is OrderPlaced -> Order(event.orderId, event.customer, event.totalCents, OrderStatus.PENDING)
        is OrderPaid -> placed(order, event).copy(status = OrderStatus.PAID, chargeId = event.chargeId)
        is OrderShipped -> placed(order, event).copy(status = OrderStatus.SHIPPED)
        is OrderDelivered -> placed(order, event).copy(status = OrderStatus.DELIVERED)
        is OrderCancelled -> placed(order, event).copy(status = OrderStatus.CANCELLED)
    }

private fun placed(order: Order?, event: OrderEvent) =
    checkNotNull(order) { "The stream of order ${event.orderId} does not start with OrderPlaced" }

fun rehydrate(events: List<OrderEvent>): Order? = events.fold<OrderEvent, Order?>(null, ::evolve)
// #endregion
