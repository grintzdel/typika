package services

fun interface LoyaltyProgram {
    fun award(customerEmail: String, points: Long)
}
