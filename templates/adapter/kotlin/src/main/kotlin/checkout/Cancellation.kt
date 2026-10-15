package checkout

import payments.PaymentGateway
import payments.RefundResult
import shop.Money

enum class CancellationOutcome { REFUNDED, REFUND_FAILED }

class Cancellation(private val payments: PaymentGateway) {
    fun cancel(paymentId: String, amount: Money) =
        when (payments.refund(paymentId, amount)) {
            RefundResult.REFUNDED -> CancellationOutcome.REFUNDED
            RefundResult.REJECTED -> CancellationOutcome.REFUND_FAILED
        }
}
