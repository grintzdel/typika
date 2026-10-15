package payments.gateways

import payments.CardToken
import payments.Payment
import payments.PaymentGateway
import payments.PaymentMethod
import shop.Ledger
import shop.Money

class CardGateway(private val ledger: Ledger) : PaymentGateway {
    private var payments = 0

    override fun charge(amount: Money): Payment {
        payments += 1
        ledger.record("card: charged $amount")
        return Payment("card-$payments", PaymentMethod.CARD, amount)
    }

    override fun refund(payment: Payment) {
        ledger.record("card: refunded ${payment.amount} of ${payment.id}")
    }

    override fun saveCard(customerEmail: String, cardNumber: String): CardToken {
        val token = "tok-${cardNumber.takeLast(4)}"
        ledger.record("card: saved $token for $customerEmail")
        return token
    }

    override fun subscribe(card: CardToken, monthlyFee: Money) {
        ledger.record("card: subscribed $card to $monthlyFee a month")
    }
}
