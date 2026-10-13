package shop

data class Money(val cents: Long, val currency: String = "EUR") {
    operator fun plus(other: Money) = eur(cents + other.cents)

    override fun toString() = "${cents / 100}.${(cents % 100).toString().padStart(2, '0')} $currency"

    companion object {
        val ZERO = eur(0)
    }
}

fun eur(cents: Long) = Money(cents, "EUR")
