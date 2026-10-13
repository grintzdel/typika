package orders

import shop.Order

typealias OrderId = String

interface OrderRepository {
    fun add(order: Order): OrderId

    fun find(id: OrderId): Order?
}

class InMemoryOrderRepository : OrderRepository {
    private val orders = mutableMapOf<OrderId, Order>()

    override fun add(order: Order): OrderId {
        val id = "order-${orders.size + 1}"
        orders[id] = order
        return id
    }

    override fun find(id: OrderId) = orders[id]
}
