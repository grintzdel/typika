package infrastructure

import checkout.Notifier

class SmtpMailer(private val host: String, private val port: Int) : Notifier {
    override fun notify(recipient: String, message: String) {
        println("SMTP $host:$port -> $recipient: $message")
    }
}
