package orders.adapters

import infrastructure.CardProcessor
import infrastructure.Charge
import orders.ChargeResult
import orders.PaymentGateway
import shop.Money

class CardPaymentGateway(private val cards: CardProcessor) : PaymentGateway {
    override fun charge(amount: Money, cardToken: String) =
        when (val charge = cards.charge(cardToken, amount.cents)) {
            is Charge.Approved -> ChargeResult.Approved(charge.chargeId)
            is Charge.Declined -> ChargeResult.Declined(charge.reason)
        }

    override fun refund(paymentId: String) {
        cards.refund(paymentId)
    }
}
