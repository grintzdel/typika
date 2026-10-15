package orders.read

import orders.OrderEvent
import orders.OrderPlaced
import orders.OrderStatus
import orders.Projection
import orders.statusAfter

data class OrderView(val orderId: String, val status: OrderStatus, val customerEmail: String, val totalCents: Int)

class OrderViews : Projection {
    private val views = mutableMapOf<String, OrderView>()

    override fun apply(event: OrderEvent) {
        if (event is OrderPlaced) {
            views[event.orderId] = OrderView(event.orderId, OrderStatus.PENDING, event.customerEmail, event.totalCents)
            return
        }
        val view = views[event.orderId] ?: return
        views[event.orderId] = view.copy(status = event.statusAfter)
    }

    fun find(orderId: String) = views[orderId]
}
