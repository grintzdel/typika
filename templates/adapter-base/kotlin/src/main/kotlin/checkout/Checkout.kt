package checkout

import shop.Card
import shop.Money
import shop.Order
import vendor.legacypay.LegacyPayClient
import vendor.legacypay.LegacyPayCodes

sealed interface PaymentOutcome {
    data class Paid(val paymentId: String, val amount: Money) : PaymentOutcome

    data class Declined(val message: String) : PaymentOutcome

    data object RetryLater : PaymentOutcome
}

private const val EUR_NUMERIC_CODE = 978

class Checkout(private val client: LegacyPayClient) {
    fun pay(order: Order, card: Card): PaymentOutcome {
        val amount = order.total
        val response = client.makePayment(amount.cents, EUR_NUMERIC_CODE, card.token)

        return when (response.code) {
            LegacyPayCodes.APPROVED -> PaymentOutcome.Paid(response.reference, amount)
            LegacyPayCodes.INSUFFICIENT_FUNDS -> PaymentOutcome.Declined("Your card was declined: insufficient funds.")
            LegacyPayCodes.EXPIRED_CARD -> PaymentOutcome.Declined("Your card has expired.")
            LegacyPayCodes.ISSUER_UNAVAILABLE -> PaymentOutcome.RetryLater
            else -> PaymentOutcome.Declined("Your card was declined.")
        }
    }
}
