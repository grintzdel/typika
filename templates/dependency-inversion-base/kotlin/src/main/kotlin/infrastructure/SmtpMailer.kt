package infrastructure

class SmtpMailer(private val host: String, private val port: Int) {
    fun notify(recipient: String, message: String) {
        println("SMTP $host:$port -> $recipient: $message")
    }
}
