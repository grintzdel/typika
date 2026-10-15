package shop

data class Money(val cents: Long, val currency: String = "EUR") {
    override fun toString() = "${cents / 100}.${(cents % 100).toString().padStart(2, '0')} $currency"
}

fun eur(cents: Long) = Money(cents, "EUR")
