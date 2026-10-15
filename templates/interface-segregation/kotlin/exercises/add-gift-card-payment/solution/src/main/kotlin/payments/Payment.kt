package payments

import shop.Money

enum class PaymentMethod(val label: String) {
    CARD("card"),
    BANK_TRANSFER("bank-transfer"),
    GIFT_CARD("gift-card"),
    ;

    override fun toString() = label
}

data class Payment(val id: String, val method: PaymentMethod, val amount: Money)

typealias CardToken = String
