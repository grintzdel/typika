package orders.adapters

import infrastructure.InMemoryDatabase
import infrastructure.OrderLineRow
import infrastructure.OrderRow
import orders.OrderRepository
import orders.domain.Customer
import orders.domain.Order
import orders.domain.OrderId
import orders.domain.OrderLine
import orders.domain.UnsavedOrder
import shop.Money

private fun Order.toRow() =
    OrderRow(
        id = id,
        customerEmail = customer.email,
        customerName = customer.name,
        lines = lines.map { OrderLineRow(it.sku, it.unitPrice.cents, it.quantity) },
        totalCents = total.cents,
        placedAt = placedAt,
        chargeId = chargeId,
        deliveredAt = deliveredAt,
        isPaid = isPaid,
        isShipped = isShipped,
        isDelivered = isDelivered,
        isCancelled = isCancelled,
    )

private fun OrderRow.toOrder() =
    Order(
        id = id,
        customer = Customer(customerName, customerEmail),
        lines = lines.map { OrderLine(it.sku, Money(it.unitPriceCents), it.quantity) },
        total = Money(totalCents),
        placedAt = placedAt,
        chargeId = chargeId,
        deliveredAt = deliveredAt,
        isPaid = isPaid,
        isShipped = isShipped,
        isDelivered = isDelivered,
        isCancelled = isCancelled,
    )

class InMemoryOrderRepository(private val db: InMemoryDatabase) : OrderRepository {
    override fun add(order: UnsavedOrder): Order {
        val saved = order.savedAs(db.nextOrderId())
        db.orders[saved.id] = saved.toRow()
        return saved
    }

    override fun update(order: Order) {
        db.orders[order.id] = order.toRow()
    }

    override fun find(id: OrderId) = db.orders[id]?.toOrder()

    override fun findByCustomer(email: String) =
        db.orders.values.filter { it.customerEmail == email }.map { it.toOrder() }
}
