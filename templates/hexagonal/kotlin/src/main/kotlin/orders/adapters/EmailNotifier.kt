package orders.adapters

import infrastructure.Email
import infrastructure.SmtpMailer
import orders.Notifier
import orders.OrderNotification

private fun emailFor(notification: OrderNotification): Email {
    val (id, customer) = notification.order
    val to = customer.email
    return when (notification) {
        is OrderNotification.Confirmed ->
            Email(
                to,
                "Order $id confirmed",
                "Hello ${customer.name}, we received your order of ${notification.order.total}.",
            )
        is OrderNotification.Shipped ->
            Email(to, "Order $id shipped", "Hello ${customer.name}, your order is on its way.")
        is OrderNotification.Cancelled ->
            Email(
                to,
                "Order $id cancelled",
                "Hello ${customer.name}, your order was cancelled: ${notification.reason}.",
            )
    }
}

class EmailNotifier(private val mailer: SmtpMailer) : Notifier {
    override fun notify(notification: OrderNotification) {
        mailer.send(emailFor(notification))
    }
}
