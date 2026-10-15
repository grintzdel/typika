package orders.subscribers

import orders.OrderPlacedSubscriber
import services.Analytics

fun trackSale(analytics: Analytics) = OrderPlacedSubscriber { event ->
    analytics.track("order_placed", mapOf("orderId" to event.orderId, "totalCents" to event.total.cents))
}
