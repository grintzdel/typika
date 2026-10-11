import { CardProcessor } from './infrastructure/card-processor.ts'
import { FakeBroker } from './infrastructure/fake-broker.ts'
import { InMemoryDatabase } from './infrastructure/in-memory-database.ts'
import { ManualClock } from './infrastructure/manual-clock.ts'
import { SmtpMailer } from './infrastructure/smtp-mailer.ts'
import { BrokerEventPublisher } from './orders/adapters/broker-event-publisher.ts'
import { CardPaymentGateway } from './orders/adapters/card-payment-gateway.ts'
import { CsvImportAdapter } from './orders/adapters/csv-import-adapter.ts'
import { EmailNotifier } from './orders/adapters/email-notifier.ts'
import { HttpOrdersAdapter } from './orders/adapters/http-orders-adapter.ts'
import { InMemoryOrderRepository } from './orders/adapters/in-memory-order-repository.ts'
import { OrderService } from './orders/order-service.ts'

// #region tour:wiring
export const openShop = () => {
  const cards = new CardProcessor()
  const broker = new FakeBroker()
  const mailer = new SmtpMailer('smtp.shop.example')
  const clock = new ManualClock('2026-10-01T09:00:00Z')
  const orders = new OrderService({
    orders: new InMemoryOrderRepository(new InMemoryDatabase()),
    payments: new CardPaymentGateway(cards),
    notifier: new EmailNotifier(mailer),
    events: new BrokerEventPublisher(broker),
    clock,
  })
  const http = new HttpOrdersAdapter(orders)
  const csvImport = new CsvImportAdapter(orders)
  return { http, csvImport, cards, broker, mailer, clock }
}
// #endregion
