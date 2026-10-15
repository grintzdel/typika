package loyalty

import infrastructure.Message

// #region tour:consumer
class LoyaltyPoints {
    private val points = mutableMapOf<String, Int>()
    private val handled = mutableSetOf<String>()

    fun handle(message: Message) {
        val (topic, payload) = message
        if (topic != "OrderPlaced") return
        val customerEmail = payload["customerEmail"] as? String ?: return
        val totalCents = payload["totalCents"] as? Int ?: return
        if (!handled.add("$topic:${payload["orderId"]}")) return

        points[customerEmail] = pointsOf(customerEmail) + totalCents / 100
    }
    // #endregion

    fun pointsOf(customerEmail: String) = points[customerEmail] ?: 0
}
