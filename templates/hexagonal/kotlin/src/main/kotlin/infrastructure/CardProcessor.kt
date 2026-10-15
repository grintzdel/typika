package infrastructure

sealed interface Charge {
    data class Approved(val chargeId: String) : Charge

    data class Declined(val reason: String) : Charge
}

private val DECLINED_CARDS = mapOf("tok_refused" to "Card refused", "tok_no_funds" to "Insufficient funds")

class CardProcessor {
    private val refunds = mutableListOf<String>()
    private var charges = 0

    val refunded: List<String>
        get() = refunds

    fun charge(cardToken: String, amountCents: Int): Charge {
        DECLINED_CARDS[cardToken]?.let { return Charge.Declined(it) }
        charges += 1
        println("card $cardToken charged $amountCents cents")
        return Charge.Approved("ch_$charges")
    }

    fun refund(chargeId: String) {
        refunds += chargeId
    }
}
