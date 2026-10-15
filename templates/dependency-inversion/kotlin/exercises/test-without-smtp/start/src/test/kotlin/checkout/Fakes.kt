package checkout

import shop.Order

class FakeNotifier : Notifier {
    val sent = mutableListOf<String>()

    override fun notify(recipient: String, message: String) {
        sent += "$recipient: $message"
    }
}

class FakeOrders : OrderRepository {
    val saved = mutableMapOf<OrderId, Order>()
    var failure: Exception? = null

    override fun add(order: Order): OrderId {
        failure?.let { throw it }
        val id = "order-${saved.size + 1}"
        saved[id] = order
        return id
    }

    override fun find(id: OrderId): Order? = saved[id]
}
