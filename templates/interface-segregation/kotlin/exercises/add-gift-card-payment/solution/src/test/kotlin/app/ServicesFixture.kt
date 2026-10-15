package app

import payments.GiftCards
import shop.Ledger
import shop.Money

class FakeGiftCards : GiftCards {
    val redeemed = mutableListOf<Money>()
    var refusal: Exception? = null

    override fun redeem(amount: Money): String {
        refusal?.let { throw it }
        redeemed += amount
        return "gift-1"
    }
}

class FakeServices {
    val ledger = Ledger()
    val giftCards = FakeGiftCards()

    fun open() = openShop(ShopServices(ledger, giftCards))
}
