package notifications

fun interface Mailer {
    fun send(to: String, body: String)
}
