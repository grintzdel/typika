import { CardProcessor } from './infrastructure/card-processor.ts'
import { FakeBroker } from './infrastructure/fake-broker.ts'
import { ManualClock } from './infrastructure/manual-clock.ts'
import { SmtpMailer } from './infrastructure/smtp-mailer.ts'
import { CustomerHistory } from './orders/customer-history.ts'
import { InMemoryEventStore } from './orders/event-store.ts'
import { OrdersHandler } from './orders/orders-handler.ts'

export const openShop = () => {
  const cards = new CardProcessor()
  const broker = new FakeBroker()
  const mailer = new SmtpMailer('smtp.shop.example')
  const clock = new ManualClock('2026-10-01T09:00:00Z')
  const store = new InMemoryEventStore()
  const history = new CustomerHistory()
  store.subscribe((event) => history.apply(event))
  const http = new OrdersHandler({ store, history, cards, broker, mailer, clock })
  return { http, cards, broker, mailer, clock }
}
