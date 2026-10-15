// A simulated third-party SDK: the shop cannot change it, only adapt to it.
package vendor.swiftpay

data class SwiftPayAmount(val value: String, val currency: String)

data class SwiftPayCharge(val amount: SwiftPayAmount, val source: String)

class SwiftPayException(val code: String) : RuntimeException("SwiftPay error: $code")

private val ERRORS_BY_SOURCE = mapOf(
    "src_declined" to "card_declined",
    "src_no_funds" to "insufficient_funds",
    "src_expired" to "expired_card",
    "src_busy" to "try_again",
)

private val DECIMAL_AMOUNT = Regex("""(\d+)\.(\d{2})""")

private fun centsOf(amount: SwiftPayAmount): Long {
    val match = DECIMAL_AMOUNT.matchEntire(amount.value)
    if (match == null || amount.currency != "EUR") {
        throw IllegalArgumentException("SwiftPay: invalid amount ${amount.value} ${amount.currency}")
    }
    val (units, hundredths) = match.destructured
    return units.toLong() * 100 + hundredths.toLong()
}

class SwiftPayClient {
    private val charges = mutableMapOf<String, SwiftPayCharge>()
    private val balances = mutableMapOf<String, Long>()

    fun createCharge(amount: SwiftPayAmount, source: String): String {
        val cents = centsOf(amount)
        ERRORS_BY_SOURCE[source]?.let { throw SwiftPayException(it) }

        val id = "sp_ch_${charges.size + 1}"
        charges[id] = SwiftPayCharge(amount, source)
        balances[id] = cents
        return id
    }

    fun createRefund(charge: String, amount: SwiftPayAmount) {
        val cents = centsOf(amount)
        val balance = balances[charge] ?: throw SwiftPayException("no_such_charge")
        if (cents > balance) throw SwiftPayException("amount_too_large")

        balances[charge] = balance - cents
    }

    fun findCharge(id: String): SwiftPayCharge? = charges[id]
}
