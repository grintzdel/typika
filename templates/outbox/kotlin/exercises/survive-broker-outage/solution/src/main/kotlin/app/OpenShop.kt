package app

import infrastructure.CardProcessor
import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase
import infrastructure.ManualClock
import infrastructure.SmtpMailer
import orders.OrdersHandler
import orders.OutboxRelay

data class Shop(
    val http: OrdersHandler,
    val relay: OutboxRelay,
    val cards: CardProcessor,
    val broker: FakeBroker,
    val mailer: SmtpMailer,
    val clock: ManualClock,
)

fun openShop(): Shop {
    val db = InMemoryDatabase()
    val cards = CardProcessor()
    val broker = FakeBroker()
    val mailer = SmtpMailer("smtp.shop.example")
    val clock = ManualClock("2026-10-01T09:00:00Z")
    val relay = OutboxRelay(db, broker)
    val http = OrdersHandler(db, cards, relay, mailer, clock)
    return Shop(http, relay, cards, broker, mailer, clock)
}
