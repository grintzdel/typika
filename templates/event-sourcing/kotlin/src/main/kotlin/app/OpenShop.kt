package app

import infrastructure.CardProcessor
import infrastructure.FakeBroker
import infrastructure.ManualClock
import infrastructure.SmtpMailer
import orders.CustomerHistory
import orders.InMemoryEventStore
import orders.OrdersHandler

data class Shop(
    val http: OrdersHandler,
    val cards: CardProcessor,
    val broker: FakeBroker,
    val mailer: SmtpMailer,
    val clock: ManualClock,
)

fun openShop(): Shop {
    val cards = CardProcessor()
    val broker = FakeBroker()
    val mailer = SmtpMailer("smtp.shop.example")
    val clock = ManualClock("2026-10-01T09:00:00Z")
    val store = InMemoryEventStore()
    val history = CustomerHistory()
    store.subscribe(history::apply)
    return Shop(OrdersHandler(store, history, cards, broker, mailer, clock), cards, broker, mailer, clock)
}
