package orders

import invoices.formatInvoice
import pricing.priceOrder
import services.Notifier
import shop.Money
import shop.Order

data class PlacedOrder(val orderId: OrderId, val total: Money)

// #region tour:orchestrator
class OrderService(private val orders: OrderRepository, private val notifier: Notifier) {
    fun placeOrder(order: Order): PlacedOrder {
        validateOrder(order)
        val priced = priceOrder(order)
        val orderId = orders.add(order)
        notifier.notify(order.customer.email, formatInvoice(orderId, priced))
        return PlacedOrder(orderId, priced.total)
    }
}
// #endregion
