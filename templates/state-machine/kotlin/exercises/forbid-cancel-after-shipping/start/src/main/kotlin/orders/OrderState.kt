package orders

import kotlin.time.Instant

enum class OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }

// #region tour:states
sealed class OrderState(val status: OrderStatus) {
    data object Pending : OrderState(OrderStatus.PENDING)

    data object Paid : OrderState(OrderStatus.PAID)

    data object Shipped : OrderState(OrderStatus.SHIPPED)

    data class Delivered(val deliveredAt: Instant) : OrderState(OrderStatus.DELIVERED)

    data class Cancelled(val reason: String) : OrderState(OrderStatus.CANCELLED)
}
// #endregion

enum class OrderAction { PAY, SHIP, DELIVER, CANCEL }

fun OrderStatus.label() = name.lowercase()

fun OrderAction.label() = name.lowercase()

class InvalidTransitionException(val from: OrderStatus, val action: OrderAction) :
    RuntimeException("Cannot ${action.label()} an order that is ${from.label()}")

data class TransitionContext(val at: Instant, val reason: String? = null)

private fun enter(status: OrderStatus, context: TransitionContext): OrderState =
    when (status) {
        OrderStatus.PENDING -> OrderState.Pending
        OrderStatus.PAID -> OrderState.Paid
        OrderStatus.SHIPPED -> OrderState.Shipped
        OrderStatus.DELIVERED -> OrderState.Delivered(context.at)
        OrderStatus.CANCELLED -> OrderState.Cancelled(context.reason ?: "no reason given")
    }

// #region tour:transitions
private fun movesFrom(state: OrderState): Map<OrderAction, OrderStatus> =
    when (state) {
        OrderState.Pending -> mapOf(OrderAction.PAY to OrderStatus.PAID, OrderAction.CANCEL to OrderStatus.CANCELLED)
        OrderState.Paid -> mapOf(OrderAction.SHIP to OrderStatus.SHIPPED, OrderAction.CANCEL to OrderStatus.CANCELLED)
        OrderState.Shipped ->
            mapOf(OrderAction.DELIVER to OrderStatus.DELIVERED, OrderAction.CANCEL to OrderStatus.CANCELLED)
        is OrderState.Delivered -> emptyMap()
        is OrderState.Cancelled -> emptyMap()
    }

fun transition(state: OrderState, action: OrderAction, context: TransitionContext): OrderState {
    val next = movesFrom(state)[action] ?: throw InvalidTransitionException(state.status, action)
    return enter(next, context)
}
// #endregion
