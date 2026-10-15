package orders

import orders.domain.Order
import orders.domain.OrderId
import orders.domain.OrderNotFoundException
import orders.domain.OrderRequest
import orders.domain.PaymentDeclinedException
import orders.domain.createOrder
import shop.Money

class OrderService(
    private val orders: OrderRepository,
    private val payments: PaymentGateway,
    private val notifier: Notifier,
    private val events: OrderEventPublisher,
    private val clock: Clock,
) : OrderUseCases {
    override fun placeOrder(request: OrderRequest): Order {
        val order = orders.add(createOrder(request, clock.now()))
        events.publish(OrderEvent(OrderEventType.OrderPlaced, order))
        notifier.notify(OrderNotification.Confirmed(order))
        return order
    }

    override fun payOrder(id: OrderId, cardToken: String): Order {
        val order = findOrder(id)
        order.ensurePayable()
        val paid = when (val charge = payments.charge(order.total, cardToken)) {
            is ChargeResult.Declined -> throw PaymentDeclinedException(charge.reason)
            is ChargeResult.Approved -> order.markPaid(charge.paymentId)
        }
        orders.update(paid)
        events.publish(OrderEvent(OrderEventType.OrderPaid, paid))
        return paid
    }

    override fun shipOrder(id: OrderId): Order {
        val shipped = findOrder(id).ship()
        orders.update(shipped)
        events.publish(OrderEvent(OrderEventType.OrderShipped, shipped))
        notifier.notify(OrderNotification.Shipped(shipped))
        return shipped
    }

    override fun deliverOrder(id: OrderId): Order {
        val delivered = findOrder(id).deliver(clock.now())
        orders.update(delivered)
        events.publish(OrderEvent(OrderEventType.OrderDelivered, delivered))
        return delivered
    }

    override fun cancelOrder(id: OrderId, reason: String): Order {
        val cancelled = findOrder(id).cancel()
        cancelled.chargeId?.let(payments::refund)
        orders.update(cancelled)
        events.publish(OrderEvent(OrderEventType.OrderCancelled, cancelled))
        notifier.notify(OrderNotification.Cancelled(cancelled, reason))
        return cancelled
    }

    override fun findOrder(id: OrderId) = orders.find(id) ?: throw OrderNotFoundException("Order $id not found")

    override fun customerHistory(email: String): CustomerHistory {
        val placed = orders.findByCustomer(email)
        return CustomerHistory(
            orderCount = placed.size,
            totalSpent = placed.filterNot { it.isCancelled }.fold(Money.ZERO) { sum, order -> sum + order.total },
            lastStatus = placed.lastOrNull()?.status,
        )
    }
}
