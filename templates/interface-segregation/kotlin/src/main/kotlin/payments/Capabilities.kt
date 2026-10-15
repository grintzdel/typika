package payments

import shop.Money

// #region tour:split
fun interface Chargeable {
    fun charge(amount: Money): Payment
}

fun interface Refundable {
    fun refund(payment: Payment)
}

fun interface CardVault {
    fun saveCard(customerEmail: String, cardNumber: String): CardToken
}

fun interface RecurringPayments {
    fun subscribe(card: CardToken, monthlyFee: Money)
}
// #endregion
