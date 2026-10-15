package orders.subscribers

import orders.OrderPlacedSubscriber
import services.Notifier

fun sendConfirmation(notifier: Notifier) = OrderPlacedSubscriber { (orderId, order, total) ->
    notifier.notify(order.customer.email, "Order $orderId confirmed: $total")
}
