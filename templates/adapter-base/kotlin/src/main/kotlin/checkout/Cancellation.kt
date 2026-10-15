package checkout

import shop.Money
import vendor.legacypay.LegacyPayClient
import vendor.legacypay.LegacyPayCodes

enum class CancellationOutcome { REFUNDED, REFUND_FAILED }

class Cancellation(private val client: LegacyPayClient) {
    fun cancel(paymentId: String, amount: Money): CancellationOutcome {
        val response = client.reversePayment(paymentId, amount.cents)
        return if (response.code == LegacyPayCodes.APPROVED) {
            CancellationOutcome.REFUNDED
        } else {
            CancellationOutcome.REFUND_FAILED
        }
    }
}
