package payments

import shop.Card
import shop.Money
import vendor.legacypay.LegacyPayClient
import vendor.legacypay.LegacyPayCodes
import vendor.legacypay.LegacyPayResponse

private val NUMERIC_CURRENCY_CODES = mapOf("EUR" to 978)

// #region tour:translation
class LegacyPayAdapter(private val client: LegacyPayClient) : PaymentGateway {
    override fun charge(amount: Money, card: Card): ChargeResult {
        val response = client.makePayment(amount.cents, NUMERIC_CURRENCY_CODES.getValue(amount.currency), card.token)
        return chargeResultOf(response)
    }

    override fun refund(paymentId: String, amount: Money): RefundResult {
        val response = client.reversePayment(paymentId, amount.cents)
        return if (response.code == LegacyPayCodes.APPROVED) RefundResult.REFUNDED else RefundResult.REJECTED
    }
}
// #endregion

// #region tour:error-mapping
private fun chargeResultOf(response: LegacyPayResponse): ChargeResult =
    when (response.code) {
        LegacyPayCodes.INSUFFICIENT_FUNDS -> ChargeResult.Declined(DeclineReason.INSUFFICIENT_FUNDS)
        LegacyPayCodes.EXPIRED_CARD -> ChargeResult.Declined(DeclineReason.EXPIRED_CARD)
        LegacyPayCodes.ISSUER_UNAVAILABLE -> ChargeResult.Unavailable
        else -> ChargeResult.Approved(response.reference)
    }
// #endregion
