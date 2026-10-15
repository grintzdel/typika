package app

import infrastructure.CardProcessor
import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase
import infrastructure.ManualClock
import infrastructure.SmtpMailer
import orders.OrdersHandler
import orders.read.CustomerOrderSummaries
import orders.read.OrderViews
import orders.read.RevenueByDay
import orders.write.OrderCommandHandler

data class Shop(
    val http: OrdersHandler,
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
    val orderViews = OrderViews()
    val customerSummaries = CustomerOrderSummaries()
    val revenueByDay = RevenueByDay()
    val commands = OrderCommandHandler(
        db = InMemoryDatabase(),
        cards = cards,
        broker = broker,
        mailer = mailer,
        clock = clock,
        projections = listOf(orderViews, customerSummaries, revenueByDay),
    )
    val http = OrdersHandler(commands, orderViews, customerSummaries, revenueByDay)
    return Shop(http, cards, broker, mailer, clock)
}
// #endregion
