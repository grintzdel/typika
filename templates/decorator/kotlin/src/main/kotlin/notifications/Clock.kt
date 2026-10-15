package notifications

fun interface Clock {
    fun now(): Long
}
