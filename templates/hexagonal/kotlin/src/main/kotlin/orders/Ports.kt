package orders

import orders.domain.Order
import orders.domain.OrderId
import orders.domain.OrderRequest
import orders.domain.OrderStatus
import orders.domain.UnsavedOrder
import shop.Money
import kotlin.time.Instant

data class CustomerHistory(val orderCount: Int, val totalSpent: Money, val lastStatus: OrderStatus?)

sealed interface ChargeResult {
    data class Approved(val paymentId: String) : ChargeResult

    data class Declined(val reason: String) : ChargeResult
}

sealed interface OrderNotification {
    val order: Order

    data class Confirmed(override val order: Order) : OrderNotification

    data class Shipped(override val order: Order) : OrderNotification

    data class Cancelled(override val order: Order, val reason: String) : OrderNotification
}

enum class OrderEventType { OrderPlaced, OrderPaid, OrderShipped, OrderDelivered, OrderCancelled }

data class OrderEvent(val type: OrderEventType, val order: Order)

// #region tour:ports
interface OrderUseCases {
    fun placeOrder(request: OrderRequest): Order

    fun payOrder(id: OrderId, cardToken: String): Order

    fun shipOrder(id: OrderId): Order

    fun deliverOrder(id: OrderId): Order

    fun cancelOrder(id: OrderId, reason: String): Order

    fun findOrder(id: OrderId): Order

    fun customerHistory(email: String): CustomerHistory
}

interface OrderRepository {
    fun add(order: UnsavedOrder): Order

    fun update(order: Order)

    fun find(id: OrderId): Order?

    fun findByCustomer(email: String): List<Order>
}

interface PaymentGateway {
    fun charge(amount: Money, cardToken: String): ChargeResult

    fun refund(paymentId: String)
}

fun interface Notifier {
    fun notify(notification: OrderNotification)
}

fun interface OrderEventPublisher {
    fun publish(event: OrderEvent)
}

fun interface Clock {
    fun now(): Instant
}
// #endregion
