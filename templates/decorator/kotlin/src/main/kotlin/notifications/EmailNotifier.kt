package notifications

class EmailNotifier(private val mailer: Mailer) : Notifier {
    override fun notify(recipient: String, message: String) {
        mailer.send(recipient, message)
    }
}
