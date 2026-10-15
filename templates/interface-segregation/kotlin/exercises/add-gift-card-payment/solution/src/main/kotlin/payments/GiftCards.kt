package payments

import shop.Money

fun interface GiftCards {
    fun redeem(amount: Money): String
}
