package orders.write

import infrastructure.OrderLineRow

data class CustomerDetails(val name: String, val email: String)

// #region tour:commands
sealed interface OrderCommand

data class PlaceOrder(val customer: CustomerDetails, val lines: List<OrderLineRow>) : OrderCommand

sealed interface OrderChange : OrderCommand {
    val orderId: String
}

data class PayOrder(override val orderId: String, val cardToken: String) : OrderChange

data class ShipOrder(override val orderId: String) : OrderChange

data class DeliverOrder(override val orderId: String) : OrderChange

data class CancelOrder(override val orderId: String, val reason: String) : OrderChange

enum class Rejection { INVALID, NOT_FOUND, CONFLICT, PAYMENT_DECLINED }

sealed interface CommandResult {
    data class Accepted(val orderId: String) : CommandResult

    data class Rejected(val rejection: Rejection, val reason: String) : CommandResult
}
// #endregion
