package orders.adapters

import infrastructure.FakeBroker
import orders.OrderEvent
import orders.OrderEventPublisher
import orders.OrderEventType

private fun payloadOf(event: OrderEvent): Map<String, Any?> {
    val order = event.order
    return when (event.type) {
        OrderEventType.OrderPlaced ->
            mapOf("orderId" to order.id, "customerEmail" to order.customer.email, "totalCents" to order.total.cents)
        OrderEventType.OrderPaid -> mapOf("orderId" to order.id, "totalCents" to order.total.cents)
        OrderEventType.OrderShipped, OrderEventType.OrderDelivered, OrderEventType.OrderCancelled ->
            mapOf("orderId" to order.id)
    }
}

class BrokerEventPublisher(private val broker: FakeBroker) : OrderEventPublisher {
    override fun publish(event: OrderEvent) {
        broker.publish(event.type.name, payloadOf(event))
    }
}
