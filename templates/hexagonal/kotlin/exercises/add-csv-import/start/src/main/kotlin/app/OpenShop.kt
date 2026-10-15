package app

import infrastructure.CardProcessor
import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase
import infrastructure.ManualClock
import infrastructure.SmtpMailer
import orders.OrdersHandler

data class ImportReport(val imported: List<String>, val rejectedLines: List<Int>)

class CsvImport {
    fun importOrders(csv: String) = ImportReport(emptyList(), emptyList())
}

data class Shop(
    val http: OrdersHandler,
    val csvImport: CsvImport,
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
    val http = OrdersHandler(InMemoryDatabase(), cards, broker, mailer, clock)
    return Shop(http, CsvImport(), cards, broker, mailer, clock)
}
