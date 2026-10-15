package infrastructure

import checkout.OrderId
import checkout.OrderRepository
import shop.Order

class InMemoryOrderStore : OrderRepository {
    private val orders = mutableMapOf<OrderId, Order>()

    override fun add(order: Order): OrderId {
        val id = "order-${orders.size + 1}"
        orders[id] = order
        return id
    }

    override fun find(id: OrderId): Order? = orders[id]
}
