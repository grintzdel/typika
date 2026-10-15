package app

import infrastructure.CardProcessor
import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase
import infrastructure.ManualClock
import infrastructure.SmtpMailer
import orders.Clock
import orders.OrderService
import orders.adapters.BrokerEventPublisher
import orders.adapters.CardPaymentGateway
import orders.adapters.CsvImportAdapter
import orders.adapters.EmailNotifier
import orders.adapters.HttpOrdersAdapter
import orders.adapters.InMemoryOrderRepository

data class Shop(
    val http: HttpOrdersAdapter,
    val csvImport: CsvImportAdapter,
    val cards: CardProcessor,
    val broker: FakeBroker,
    val mailer: SmtpMailer,
    val clock: ManualClock,
)

// #region tour:wiring
fun openShop(): Shop {
    val cards = CardProcessor()
    val broker = FakeBroker()
    val mailer = SmtpMailer("smtp.shop.example")
    val clock = ManualClock("2026-10-01T09:00:00Z")
    val orders = OrderService(
        orders = InMemoryOrderRepository(InMemoryDatabase()),
        payments = CardPaymentGateway(cards),
        notifier = EmailNotifier(mailer),
        events = BrokerEventPublisher(broker),
        clock = Clock(clock::now),
    )
    return Shop(HttpOrdersAdapter(orders), CsvImportAdapter(orders), cards, broker, mailer, clock)
}
// #endregion
