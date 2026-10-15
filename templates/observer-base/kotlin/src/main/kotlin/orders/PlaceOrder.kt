package orders

import services.Analytics
import services.Notifier
import services.Stock
import shop.Order

fun placeOrder(order: Order, orders: OrderRepository, stock: Stock, notifier: Notifier, analytics: Analytics): OrderId {
    val orderId = orders.add(order)
    val total = order.total

    stock.reserve(order.lines)
    notifier.notify(order.customer.email, "Order $orderId confirmed: $total")
    analytics.track("order_placed", mapOf("orderId" to orderId, "totalCents" to total.cents))

    return orderId
}
