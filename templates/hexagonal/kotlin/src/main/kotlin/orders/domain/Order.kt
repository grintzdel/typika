package orders.domain

import shop.Money
import kotlin.time.Instant

typealias OrderId = String

enum class OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }

data class Customer(val name: String, val email: String)

data class OrderLine(val sku: String, val unitPrice: Money, val quantity: Int)

data class OrderLineRequest(val sku: String, val unitPriceCents: Int, val quantity: Int)

data class OrderRequest(val customer: Customer, val lines: List<OrderLineRequest>)

data class UnsavedOrder(val customer: Customer, val lines: List<OrderLine>, val total: Money, val placedAt: Instant) {
    fun savedAs(id: OrderId) = Order(id, customer, lines, total, placedAt)
}

data class Order(
    val id: OrderId,
    val customer: Customer,
    val lines: List<OrderLine>,
    val total: Money,
    val placedAt: Instant,
    val chargeId: String? = null,
    val deliveredAt: Instant? = null,
    val isPaid: Boolean = false,
    val isShipped: Boolean = false,
    val isDelivered: Boolean = false,
    val isCancelled: Boolean = false,
) {
    val status: OrderStatus
        get() =
            when {
                isCancelled -> OrderStatus.CANCELLED
                isDelivered -> OrderStatus.DELIVERED
                isShipped -> OrderStatus.SHIPPED
                isPaid -> OrderStatus.PAID
                else -> OrderStatus.PENDING
            }

    fun ensurePayable() {
        if (isCancelled) throw OrderConflictException("Order $id is cancelled")
        if (isPaid) throw OrderConflictException("Order $id is already paid")
    }

    fun markPaid(chargeId: String) = copy(isPaid = true, chargeId = chargeId)

    fun ship(): Order {
        if (isCancelled) throw OrderConflictException("Order $id is cancelled")
        if (!isPaid) throw OrderConflictException("Order $id is not paid")
        if (isShipped) throw OrderConflictException("Order $id has already shipped")
        return copy(isShipped = true)
    }

    fun deliver(at: Instant): Order {
        if (!isShipped || isDelivered) throw OrderConflictException("Order $id is not on its way")
        return copy(isDelivered = true, deliveredAt = at)
    }

    fun cancel(): Order {
        if (isShipped) throw OrderConflictException("Order $id has already shipped")
        if (isCancelled) throw OrderConflictException("Order $id is already cancelled")
        return copy(isCancelled = true)
    }
}

// #region tour:domain
fun createOrder(request: OrderRequest, placedAt: Instant): UnsavedOrder {
    val (customer, lines) = request
    if (customer.name.isEmpty()) throw InvalidOrderException("A customer name is required")
    if ('@' !in customer.email) throw InvalidOrderException("A valid customer email is required")
    if (lines.isEmpty()) throw InvalidOrderException("An order needs at least one line")
    for (line in lines) {
        if (line.sku.isEmpty()) throw InvalidOrderException("Each line needs a sku")
        if (line.unitPriceCents <= 0 || line.quantity <= 0) {
            throw InvalidOrderException("Line ${line.sku} needs a positive whole price and quantity")
        }
    }

    val orderLines = lines.map { OrderLine(it.sku, Money(it.unitPriceCents), it.quantity) }
    val total = orderLines.fold(Money.ZERO) { sum, line -> sum + line.unitPrice * line.quantity }
    return UnsavedOrder(customer, orderLines, total, placedAt)
}
// #endregion
