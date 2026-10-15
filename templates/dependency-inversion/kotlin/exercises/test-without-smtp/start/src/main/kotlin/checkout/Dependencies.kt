package checkout

import shop.Order

typealias OrderId = String

fun interface Notifier {
    fun notify(recipient: String, message: String)
}

interface OrderRepository {
    fun add(order: Order): OrderId

    fun find(id: OrderId): Order?
}
