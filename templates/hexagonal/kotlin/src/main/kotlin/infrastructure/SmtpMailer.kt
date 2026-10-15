package infrastructure

data class Email(val to: String, val subject: String, val body: String)

class SmtpMailer(private val host: String) {
    private val emails = mutableListOf<Email>()

    val sent: List<Email>
        get() = emails

    fun send(email: Email) {
        emails += email
        println("SMTP $host -> ${email.to}: ${email.subject}")
    }
}
