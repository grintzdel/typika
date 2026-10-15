package notifications

fun interface Notifier {
    fun notify(recipient: String, message: String)
}
