import { CardProcessor } from './infrastructure/card-processor.ts'
import { FakeBroker } from './infrastructure/fake-broker.ts'
import { InMemoryDatabase } from './infrastructure/in-memory-database.ts'
import { ManualClock } from './infrastructure/manual-clock.ts'
import { SmtpMailer } from './infrastructure/smtp-mailer.ts'
import { OrdersHandler } from './orders/orders-handler.ts'
import { OutboxRelay } from './orders/outbox-relay.ts'

export const openShop = () => {
  const db = new InMemoryDatabase()
  const cards = new CardProcessor()
  const broker = new FakeBroker()
  const mailer = new SmtpMailer('smtp.shop.example')
  const clock = new ManualClock('2026-10-01T09:00:00Z')
  const relay = new OutboxRelay(db, broker)
  const http = new OrdersHandler({ db, cards, relay, mailer, clock })
  return { http, relay, cards, broker, mailer, clock }
}
