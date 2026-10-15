package orders.adapters

import infrastructure.SmtpMailer
import orders.Notifier
import orders.OrderNotification

class EmailNotifier(private val mailer: SmtpMailer) : Notifier {
    override fun notify(notification: OrderNotification) {}
}
