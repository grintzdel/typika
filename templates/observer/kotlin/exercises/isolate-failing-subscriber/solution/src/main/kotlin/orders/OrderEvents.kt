package orders

import shop.Money
import shop.Order

data class OrderPlaced(val orderId: OrderId, val order: Order, val total: Money)

fun interface OrderPlacedSubscriber {
    fun onOrderPlaced(event: OrderPlaced)
}

typealias Unsubscribe = () -> Unit

// #region tour:subject
class OrderEvents(private val onSubscriberError: (Exception) -> Unit) {
    private val subscribers = mutableSetOf<OrderPlacedSubscriber>()

    fun subscribe(subscriber: OrderPlacedSubscriber): Unsubscribe {
        subscribers += subscriber
        return { subscribers -= subscriber }
    }

    fun publish(event: OrderPlaced) {
        // #region tour:isolation
        for (subscriber in subscribers.toList()) {
            try {
                subscriber.onOrderPlaced(event)
            } catch (error: Exception) {
                onSubscriberError(error)
            }
        }
        // #endregion
    }
}
// #endregion
