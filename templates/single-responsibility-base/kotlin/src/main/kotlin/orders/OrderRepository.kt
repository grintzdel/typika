package orders

import shop.Order

typealias OrderId = String

interface OrderRepository {
    fun add(order: Order): OrderId
}

class InMemoryOrderRepository : OrderRepository {
    private val orders = mutableMapOf<OrderId, Order>()

    override fun add(order: Order): OrderId {
        val id = "order-${orders.size + 1}"
        orders[id] = order
        return id
    }
}
