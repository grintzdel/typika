package payments.clients

import payments.CardToken
import payments.PaymentGateway

class Wallet(private val gateway: PaymentGateway) {
    fun saveCard(customerEmail: String, cardNumber: String): CardToken = gateway.saveCard(customerEmail, cardNumber)
}
