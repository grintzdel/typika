package checkout

import payments.ChargeResult
import payments.DeclineReason
import payments.PaymentGateway
import shop.Card
import shop.Money
import shop.Order

sealed interface PaymentOutcome {
    data class Paid(val paymentId: String, val amount: Money) : PaymentOutcome

    data class Declined(val message: String) : PaymentOutcome

    data object RetryLater : PaymentOutcome
}

private fun declineMessageOf(reason: DeclineReason) =
    when (reason) {
        DeclineReason.INSUFFICIENT_FUNDS -> "Your card was declined: insufficient funds."
        DeclineReason.EXPIRED_CARD -> "Your card has expired."
        DeclineReason.REFUSED -> "Your card was declined."
    }

// #region tour:client
class Checkout(private val payments: PaymentGateway) {
    fun pay(order: Order, card: Card): PaymentOutcome {
        val amount = order.total

        return when (val result = payments.charge(amount, card)) {
            is ChargeResult.Approved -> PaymentOutcome.Paid(result.paymentId, amount)
            is ChargeResult.Declined -> PaymentOutcome.Declined(declineMessageOf(result.reason))
            ChargeResult.Unavailable -> PaymentOutcome.RetryLater
        }
    }
}
// #endregion
