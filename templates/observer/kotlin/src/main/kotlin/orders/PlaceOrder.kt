package orders

import shop.Order

fun placeOrder(order: Order, orders: OrderRepository, events: OrderEvents): OrderId {
    val orderId = orders.add(order)
    events.publish(OrderPlaced(orderId, order, order.total))
    return orderId
}
