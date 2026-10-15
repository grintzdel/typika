package infrastructure

import shop.Order

typealias OrderId = String

class InMemoryOrderStore {
    private val orders = mutableMapOf<OrderId, Order>()

    fun add(order: Order): OrderId {
        val id = "order-${orders.size + 1}"
        orders[id] = order
        return id
    }

    fun find(id: OrderId): Order? = orders[id]
}
