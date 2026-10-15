package app

import orders.InMemoryOrderRepository
import services.Analytics
import services.LoyaltyProgram
import services.Notifier
import services.Stock
import shop.OrderLine

data class Email(val recipient: String, val message: String)

data class Tracked(val event: String, val properties: Map<String, Any>)

class FakeStock : Stock {
    val reserved = mutableListOf<List<OrderLine>>()

    override fun reserve(lines: List<OrderLine>) {
        reserved.add(lines)
    }
}

class FakeNotifier : Notifier {
    val sent = mutableListOf<Email>()

    override fun notify(recipient: String, message: String) {
        sent += Email(recipient, message)
    }
}

class FakeAnalytics : Analytics {
    val tracked = mutableListOf<Tracked>()

    override fun track(event: String, properties: Map<String, Any>) {
        tracked += Tracked(event, properties)
    }
}

data class Award(val customerEmail: String, val points: Long)

class FakeLoyalty : LoyaltyProgram {
    val awarded = mutableListOf<Award>()

    override fun award(customerEmail: String, points: Long) {
        awarded += Award(customerEmail, points)
    }
}

class FakeServices {
    val stock = FakeStock()
    val notifier = FakeNotifier()
    val analytics = FakeAnalytics()
    val loyalty = FakeLoyalty()

    fun open() = openShop(ShopServices(InMemoryOrderRepository(), stock, notifier, analytics, loyalty))
}
