package services

fun interface Notifier {
    fun notify(recipient: String, message: String)
}
