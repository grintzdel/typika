package payments.gateways

import payments.Chargeable
import payments.GiftCards
import payments.Payment
import payments.PaymentMethod
import shop.Ledger
import shop.Money

class GiftCardGateway(private val giftCards: GiftCards, private val ledger: Ledger) : Chargeable {
    override fun charge(amount: Money): Payment {
        val id = giftCards.redeem(amount)
        ledger.record("gift card: redeemed $amount")
        return Payment(id, PaymentMethod.GIFT_CARD, amount)
    }
}
