package payments

import shop.Money

interface PaymentGateway {
    fun charge(amount: Money): Payment

    fun refund(payment: Payment)

    fun saveCard(customerEmail: String, cardNumber: String): CardToken

    fun subscribe(card: CardToken, monthlyFee: Money)
}
