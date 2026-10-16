package orders

import kotlin.time.Instant

enum class OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, RETURNED }

// #region tour:states
sealed class OrderState(val status: OrderStatus) {
    data object Pending : OrderState(OrderStatus.PENDING)

    data object Paid : OrderState(OrderStatus.PAID)

    data object Shipped : OrderState(OrderStatus.SHIPPED)

    data class Delivered(val deliveredAt: Instant) : OrderState(OrderStatus.DELIVERED)

    data class Cancelled(val reason: String) : OrderState(OrderStatus.CANCELLED)

    data class Returned(val returnedAt: Instant) : OrderState(OrderStatus.RETURNED)
}
// #endregion

enum class OrderAction { PAY, SHIP, DELIVER, CANCEL, RETURN }

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
        OrderStatus.RETURNED -> OrderState.Returned(context.at)
    }

// #region tour:transitions
private fun movesFrom(state: OrderState): Map<OrderAction, OrderStatus> =
    when (state) {
        OrderState.Pending -> mapOf(OrderAction.PAY to OrderStatus.PAID, OrderAction.CANCEL to OrderStatus.CANCELLED)
        OrderState.Paid -> mapOf(OrderAction.SHIP to OrderStatus.SHIPPED, OrderAction.CANCEL to OrderStatus.CANCELLED)
        OrderState.Shipped -> mapOf(OrderAction.DELIVER to OrderStatus.DELIVERED)
        is OrderState.Delivered -> mapOf(OrderAction.RETURN to OrderStatus.RETURNED)
        is OrderState.Cancelled -> emptyMap()
        is OrderState.Returned -> emptyMap()
    }

fun transition(state: OrderState, action: OrderAction, context: TransitionContext): OrderState {
    val next = movesFrom(state)[action] ?: throw InvalidTransitionException(state.status, action)
    return enter(next, context)
}
// #endregion
