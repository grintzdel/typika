import type { HttpRequest, HttpResponse } from '../http.ts'
import type { CardProcessor } from '../infrastructure/card-processor.ts'
import type { FakeBroker } from '../infrastructure/fake-broker.ts'
import type { ManualClock } from '../infrastructure/manual-clock.ts'
import type { SmtpMailer } from '../infrastructure/smtp-mailer.ts'
import { formatMoney, money } from '../shop/money.ts'
import type { CustomerHistory } from './customer-history.ts'
import type { InMemoryEventStore } from './event-store.ts'
import type { OrderLine } from './order-events.ts'
import { decide, paymentRefusal, rehydrate, type Order, type OrderCommand, type Rejection } from './order.ts'

export type OrdersHandlerDependencies = {
  readonly store: InMemoryEventStore
  readonly history: CustomerHistory
  readonly cards: CardProcessor
  readonly broker: FakeBroker
  readonly mailer: SmtpMailer
  readonly clock: ManualClock
}

type Json = Readonly<Record<string, unknown>>

const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null

const reply = (status: number, body: Json): HttpResponse => ({ status, body })
const fail = (status: number, error: string): HttpResponse => reply(status, { error })

const STATUS_OF_REJECTION = { invalid: 400, 'not-found': 404, conflict: 409 } as const

const failWith = ({ rejection, reason }: Rejection): HttpResponse => fail(STATUS_OF_REJECTION[rejection], reason)
const statusReply = (order: Order): HttpResponse => reply(200, { orderId: order.id, status: order.status })

const readLines = (lines: unknown): OrderLine[] | undefined => {
  if (!Array.isArray(lines)) return undefined
  const orderLines: OrderLine[] = []
  for (const line of lines) {
    if (!isJson(line) || typeof line.sku !== 'string') return undefined
    if (typeof line.unitPriceCents !== 'number' || typeof line.quantity !== 'number') return undefined
    orderLines.push({ sku: line.sku, unitPriceCents: line.unitPriceCents, quantity: line.quantity })
  }
  return orderLines
}

export class OrdersHandler {
  private readonly store: InMemoryEventStore
  private readonly history: CustomerHistory
  private readonly cards: CardProcessor
  private readonly broker: FakeBroker
  private readonly mailer: SmtpMailer
  private readonly clock: ManualClock

  constructor({ store, history, cards, broker, mailer, clock }: OrdersHandlerDependencies) {
    this.store = store
    this.history = history
    this.cards = cards
    this.broker = broker
    this.mailer = mailer
    this.clock = clock
  }

  handle(request: HttpRequest): HttpResponse {
    const body = isJson(request.body) ? request.body : {}
    const [, resource, id, action] = request.path.split('/')
    if (request.method === 'POST' && resource === 'orders' && id === undefined) return this.placeOrder(body)
    if (request.method === 'GET' && resource === 'orders' && id !== undefined) return this.getOrder(id)
    if (request.method === 'GET' && resource === 'customers' && action === 'orders' && id !== undefined) {
      return reply(200, this.history.forCustomer(decodeURIComponent(id)))
    }
    if (request.method === 'POST' && resource === 'orders' && id !== undefined) {
      if (action === 'pay') return this.payOrder(id, body)
      if (action === 'ship') return this.shipOrder(id)
      if (action === 'deliver') return this.deliverOrder(id)
      if (action === 'cancel') return this.cancelOrder(id, body)
    }
    return fail(404, `No route for ${request.method} ${request.path}`)
  }

  private placeOrder({ customer, lines }: Json): HttpResponse {
    const orderLines = readLines(lines)
    if (!isJson(customer) || typeof customer.name !== 'string' || typeof customer.email !== 'string' || !orderLines) {
      return fail(400, 'The order request is malformed')
    }
    const orderId = `order-${this.store.streamCount() + 1}`
    const order = this.change(orderId, {
      type: 'PlaceOrder',
      orderId,
      customer: { name: customer.name, email: customer.email },
      lines: orderLines,
    })
    if ('rejection' in order) return failWith(order)

    this.broker.publish('OrderPlaced', { orderId, customerEmail: order.customer.email, totalCents: order.totalCents })
    this.mailer.send({
      to: order.customer.email,
      subject: `Order ${orderId} confirmed`,
      body: `Hello ${order.customer.name}, we received your order of ${formatMoney(money(order.totalCents))}.`,
    })
    return reply(201, { orderId, totalCents: order.totalCents })
  }

  private payOrder(orderId: string, body: Json): HttpResponse {
    const current = rehydrate(this.store.load(orderId).events)
    if (current === undefined) return fail(404, `Order ${orderId} not found`)
    const refusal = paymentRefusal(current)
    if (refusal !== undefined) return failWith(refusal)
    if (typeof body.cardToken !== 'string') return fail(400, 'A card token is required')

    const charge = this.cards.charge(body.cardToken, current.totalCents)
    if (!charge.approved) return fail(402, charge.reason)
    const order = this.change(orderId, { type: 'PayOrder', chargeId: charge.chargeId })
    if ('rejection' in order) return failWith(order)
    this.broker.publish('OrderPaid', { orderId, totalCents: order.totalCents })
    return statusReply(order)
  }

  private shipOrder(orderId: string): HttpResponse {
    const order = this.change(orderId, { type: 'ShipOrder' })
    if ('rejection' in order) return failWith(order)
    this.broker.publish('OrderShipped', { orderId })
    this.mailer.send({
      to: order.customer.email,
      subject: `Order ${orderId} shipped`,
      body: `Hello ${order.customer.name}, your order is on its way.`,
    })
    return statusReply(order)
  }

  private deliverOrder(orderId: string): HttpResponse {
    const order = this.change(orderId, { type: 'DeliverOrder' })
    if ('rejection' in order) return failWith(order)
    this.broker.publish('OrderDelivered', { orderId })
    return statusReply(order)
  }

  private cancelOrder(orderId: string, body: Json): HttpResponse {
    const reason = typeof body.reason === 'string' ? body.reason : 'no reason given'
    const order = this.change(orderId, { type: 'CancelOrder', reason })
    if ('rejection' in order) return failWith(order)

    if (order.chargeId !== null) this.cards.refund(order.chargeId)
    this.broker.publish('OrderCancelled', { orderId })
    this.mailer.send({
      to: order.customer.email,
      subject: `Order ${orderId} cancelled`,
      body: `Hello ${order.customer.name}, your order was cancelled: ${reason}.`,
    })
    return statusReply(order)
  }

  private getOrder(orderId: string): HttpResponse {
    const order = rehydrate(this.store.load(orderId).events)
    if (order === undefined) return fail(404, `Order ${orderId} not found`)
    return reply(200, {
      orderId,
      status: order.status,
      customerEmail: order.customer.email,
      totalCents: order.totalCents,
    })
  }

  private change(orderId: string, command: OrderCommand): Order | Rejection {
    const { events, version } = this.store.load(orderId)
    const decision = decide(rehydrate(events), command, this.clock.now())
    if (!decision.accepted) return decision
    this.store.append(orderId, version, decision.events)
    const order = rehydrate([...events, ...decision.events])
    if (order === undefined) throw new Error(`Order ${orderId} has no events`)
    return order
  }
}
