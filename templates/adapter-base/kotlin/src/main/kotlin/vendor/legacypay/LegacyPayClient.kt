// A simulated third-party SDK: the shop cannot change it, only adapt to it.
package vendor.legacypay

object LegacyPayCodes {
    const val APPROVED = 0
    const val DO_NOT_HONOUR = 5
    const val INVALID_AMOUNT = 13
    const val UNKNOWN_REFERENCE = 25
    const val INSUFFICIENT_FUNDS = 51
    const val EXPIRED_CARD = 54
    const val SUSPECTED_FRAUD = 59
    const val ISSUER_UNAVAILABLE = 91
}

data class LegacyPayResponse(val code: Int, val reference: String)

data class LegacyPayment(val amountCents: Long, val currencyCode: Int, val cardToken: String)

private const val EUR = 978

private val CODES_BY_CARD_TOKEN = mapOf(
    "tok_refused" to LegacyPayCodes.DO_NOT_HONOUR,
    "tok_no_funds" to LegacyPayCodes.INSUFFICIENT_FUNDS,
    "tok_expired" to LegacyPayCodes.EXPIRED_CARD,
    "tok_fraud" to LegacyPayCodes.SUSPECTED_FRAUD,
    "tok_issuer_down" to LegacyPayCodes.ISSUER_UNAVAILABLE,
)

class LegacyPayClient {
    private val payments = mutableMapOf<String, LegacyPayment>()
    private val balances = mutableMapOf<String, Long>()

    fun makePayment(amountCents: Long, currencyCode: Int, cardToken: String): LegacyPayResponse {
        if (amountCents <= 0 || currencyCode != EUR) return LegacyPayResponse(LegacyPayCodes.INVALID_AMOUNT, "")
        val code = CODES_BY_CARD_TOKEN[cardToken] ?: LegacyPayCodes.APPROVED
        if (code != LegacyPayCodes.APPROVED) return LegacyPayResponse(code, "")

        val reference = "LP-${payments.size + 1}"
        payments[reference] = LegacyPayment(amountCents, currencyCode, cardToken)
        balances[reference] = amountCents
        return LegacyPayResponse(code, reference)
    }

    fun reversePayment(reference: String, amountCents: Long): LegacyPayResponse {
        val balance = balances[reference] ?: return LegacyPayResponse(LegacyPayCodes.UNKNOWN_REFERENCE, reference)
        if (amountCents > balance) return LegacyPayResponse(LegacyPayCodes.INVALID_AMOUNT, reference)

        balances[reference] = balance - amountCents
        return LegacyPayResponse(LegacyPayCodes.APPROVED, reference)
    }

    fun findPayment(reference: String): LegacyPayment? = payments[reference]
}
