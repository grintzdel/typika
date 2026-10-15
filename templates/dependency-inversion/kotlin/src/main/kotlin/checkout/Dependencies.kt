package checkout

import shop.Order

typealias OrderId = String

// #region tour:abstraction
fun interface Notifier {
    fun notify(recipient: String, message: String)
}

interface OrderRepository {
    fun add(order: Order): OrderId

    fun find(id: OrderId): Order?
}
// #endregion
