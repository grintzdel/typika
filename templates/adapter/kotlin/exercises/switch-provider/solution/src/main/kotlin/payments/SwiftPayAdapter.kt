package payments

import shop.Card
import shop.Money
import vendor.swiftpay.SwiftPayAmount
import vendor.swiftpay.SwiftPayClient
import vendor.swiftpay.SwiftPayException

private fun Money.toSwiftPayAmount() =
    SwiftPayAmount("${cents / 100}.${(cents % 100).toString().padStart(2, '0')}", currency)

class SwiftPayAdapter(private val client: SwiftPayClient) : PaymentGateway {
    override fun charge(amount: Money, card: Card): ChargeResult =
        try {
            ChargeResult.Approved(client.createCharge(amount.toSwiftPayAmount(), card.token))
        } catch (error: SwiftPayException) {
            when (error.code) {
                "insufficient_funds" -> ChargeResult.Declined(DeclineReason.INSUFFICIENT_FUNDS)
                "expired_card" -> ChargeResult.Declined(DeclineReason.EXPIRED_CARD)
                "try_again" -> ChargeResult.Unavailable
                else -> ChargeResult.Declined(DeclineReason.REFUSED)
            }
        }

    override fun refund(paymentId: String, amount: Money): RefundResult =
        try {
            client.createRefund(paymentId, amount.toSwiftPayAmount())
            RefundResult.REFUNDED
        } catch (error: SwiftPayException) {
            RefundResult.REJECTED
        }
}
