package checkout

import shop.Order

// #region tour:inject
class CheckoutService(private val orders: OrderRepository, private val notifier: Notifier) {
    fun placeOrder(order: Order): OrderId {
        val orderId = orders.add(order)
        notifier.notify(order.customer.email, "Order $orderId confirmed: ${order.total}")
        return orderId
    }

    fun findOrder(orderId: OrderId): Order? = orders.find(orderId)
}
// #endregion
