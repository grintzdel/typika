package orders

import services.Notifier

data class Email(val recipient: String, val message: String)

class FakeNotifier : Notifier {
    val sent = mutableListOf<Email>()

    override fun notify(recipient: String, message: String) {
        sent += Email(recipient, message)
    }
}

class FakeServices {
    val orders = InMemoryOrderRepository()
    val notifier = FakeNotifier()

    fun orderService() = OrderService(orders, notifier)
}
