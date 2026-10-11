import { CardProcessor } from './infrastructure/card-processor.ts'
import { FakeBroker } from './infrastructure/fake-broker.ts'
import { InMemoryDatabase } from './infrastructure/in-memory-database.ts'
import { ManualClock } from './infrastructure/manual-clock.ts'
import { SmtpMailer } from './infrastructure/smtp-mailer.ts'
import { OrdersHandler } from './orders/orders-handler.ts'
import { CustomerOrderSummaries } from './orders/read/customer-order-summaries.ts'
import { OrderViews } from './orders/read/order-views.ts'
import { RevenueByDay } from './orders/read/revenue-by-day.ts'
import { OrderCommandHandler } from './orders/write/order-command-handler.ts'

// #region tour:wiring
export const openShop = () => {
  const cards = new CardProcessor()
  const broker = new FakeBroker()
  const mailer = new SmtpMailer('smtp.shop.example')
  const clock = new ManualClock('2026-10-01T09:00:00Z')
  const orderViews = new OrderViews()
  const customerSummaries = new CustomerOrderSummaries()
  const revenueByDay = new RevenueByDay()
  const commands = new OrderCommandHandler({
    db: new InMemoryDatabase(),
    cards,
    broker,
    mailer,
    clock,
    projections: [orderViews, customerSummaries, revenueByDay],
  })
  const http = new OrdersHandler({ commands, orderViews, customerSummaries, revenueByDay })
  return { http, cards, broker, mailer, clock }
}
// #endregion
