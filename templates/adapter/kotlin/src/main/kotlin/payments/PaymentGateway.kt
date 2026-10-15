package payments

import shop.Card
import shop.Money

enum class DeclineReason { INSUFFICIENT_FUNDS, EXPIRED_CARD, REFUSED }

sealed interface ChargeResult {
    data class Approved(val paymentId: String) : ChargeResult

    data class Declined(val reason: DeclineReason) : ChargeResult

    data object Unavailable : ChargeResult
}

enum class RefundResult { REFUNDED, REJECTED }

// #region tour:target
interface PaymentGateway {
    fun charge(amount: Money, card: Card): ChargeResult

    fun refund(paymentId: String, amount: Money): RefundResult
}
// #endregion
