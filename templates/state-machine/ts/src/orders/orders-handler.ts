import type { HttpRequest, HttpResponse } from '../http.ts'
import type { CardProcessor } from '../infrastructure/card-processor.ts'
import type { FakeBroker } from '../infrastructure/fake-broker.ts'
import type { InMemoryDatabase, OrderLineRow, OrderRow } from '../infrastructure/in-memory-database.ts'
import type { ManualClock } from '../infrastructure/manual-clock.ts'
import type { SmtpMailer } from '../infrastructure/smtp-mailer.ts'
import { formatMoney, money } from '../shop/money.ts'
import { InvalidTransitionError, transition } from './order-state.ts'

export type OrdersHandlerDependencies = {
  readonly db: InMemoryDatabase
  readonly cards: CardProcessor
  readonly broker: FakeBroker
  readonly mailer: SmtpMailer
  readonly clock: ManualClock
}

type Json = Readonly<Record<string, unknown>>

const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null
const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0

const reply = (status: number, body: Json): HttpResponse => ({ status, body })
const fail = (status: number, error: string): HttpResponse => reply(status, { error })

export class OrdersHandler {
  private readonly db: InMemoryDatabase
  private readonly cards: CardProcessor
  private readonly broker: FakeBroker
  private readonly mailer: SmtpMailer
  private readonly clock: ManualClock

  constructor({ db, cards, broker, mailer, clock }: OrdersHandlerDependencies) {
    this.db = db
    this.cards = cards
    this.broker = broker
    this.mailer = mailer
    this.clock = clock
  }

  handle(request: HttpRequest): HttpResponse {
    try {
      return this.route(request)
    } catch (error) {
      if (error instanceof InvalidTransitionError) return fail(409, error.message)
      throw error
    }
  }

  private route(request: HttpRequest): HttpResponse {
    const body = isJson(request.body) ? request.body : {}
    const [, resource, id, action] = request.path.split('/')
    if (request.method === 'POST' && resource === 'orders' && id === undefined) return this.placeOrder(body)
    if (request.method === 'GET' && resource === 'orders' && id !== undefined) return this.getOrder(id)
    if (request.method === 'GET' && resource === 'customers' && action === 'orders' && id !== undefined) {
      return this.getCustomerOrders(decodeURIComponent(id))
    }
    if (request.method === 'POST' && resource === 'orders' && id !== undefined) {
      const order = this.db.orders.get(id)
      if (order === undefined) return fail(404, `Order ${id} not found`)
      if (action === 'pay') return this.payOrder(order, body)
      if (action === 'ship') return this.shipOrder(order)
      if (action === 'deliver') return this.deliverOrder(order)
      if (action === 'cancel') return this.cancelOrder(order, body)
    }
    return fail(404, `No route for ${request.method} ${request.path}`)
  }

  private placeOrder(body: Json): HttpResponse {
    const { customer, lines } = body
    if (!isJson(customer) || typeof customer.name !== 'string' || customer.name === '') {
      return fail(400, 'A customer name is required')
    }
    if (typeof customer.email !== 'string' || !customer.email.includes('@')) {
      return fail(400, 'A valid customer email is required')
    }
    if (!Array.isArray(lines) || lines.length === 0) return fail(400, 'An order needs at least one line')
    const rows: OrderLineRow[] = []
    for (const line of lines) {
      if (!isJson(line) || typeof line.sku !== 'string' || line.sku === '') return fail(400, 'Each line needs a sku')
      if (!isPositiveInteger(line.unitPriceCents) || !isPositiveInteger(line.quantity)) {
        return fail(400, `Line ${line.sku} needs a positive whole price and quantity`)
      }
      rows.push({ sku: line.sku, unitPriceCents: line.unitPriceCents, quantity: line.quantity })
    }

    const totalCents = rows.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
    const order: OrderRow = {
      id: this.db.nextOrderId(),
      customerEmail: customer.email,
      customerName: customer.name,
      lines: rows,
      totalCents,
      placedAt: this.clock.now(),
      chargeId: null,
      state: { status: 'pending' },
    }
    this.db.orders.set(order.id, order)
    this.broker.publish('OrderPlaced', { orderId: order.id, customerEmail: order.customerEmail, totalCents })
    this.mailer.send({
      to: order.customerEmail,
      subject: `Order ${order.id} confirmed`,
      body: `Hello ${order.customerName}, we received your order of ${formatMoney(money(totalCents))}.`,
    })
    return reply(201, { orderId: order.id, totalCents })
  }

  // #region tour:guards
  private payOrder(order: OrderRow, body: Json): HttpResponse {
    const paid = transition(order.state, 'pay', { at: this.clock.now() })
    if (typeof body.cardToken !== 'string') return fail(400, 'A card token is required')

    const charge = this.cards.charge(body.cardToken, order.totalCents)
    if (!charge.approved) return fail(402, charge.reason)
    order.state = paid
    order.chargeId = charge.chargeId
    this.broker.publish('OrderPaid', { orderId: order.id, totalCents: order.totalCents })
    return this.statusReply(order)
  }
  // #endregion

  private shipOrder(order: OrderRow): HttpResponse {
    order.state = transition(order.state, 'ship', { at: this.clock.now() })
    this.broker.publish('OrderShipped', { orderId: order.id })
    this.mailer.send({
      to: order.customerEmail,
      subject: `Order ${order.id} shipped`,
      body: `Hello ${order.customerName}, your order is on its way.`,
    })
    return this.statusReply(order)
  }

  private deliverOrder(order: OrderRow): HttpResponse {
    order.state = transition(order.state, 'deliver', { at: this.clock.now() })
    this.broker.publish('OrderDelivered', { orderId: order.id })
    return this.statusReply(order)
  }

  private cancelOrder(order: OrderRow, body: Json): HttpResponse {
    const reason = typeof body.reason === 'string' ? body.reason : 'no reason given'
    order.state = transition(order.state, 'cancel', { at: this.clock.now(), reason })

    if (order.chargeId !== null) this.cards.refund(order.chargeId)
    this.broker.publish('OrderCancelled', { orderId: order.id })
    this.mailer.send({
      to: order.customerEmail,
      subject: `Order ${order.id} cancelled`,
      body: `Hello ${order.customerName}, your order was cancelled: ${reason}.`,
    })
    return this.statusReply(order)
  }

  private getOrder(id: string): HttpResponse {
    const order = this.db.orders.get(id)
    if (order === undefined) return fail(404, `Order ${id} not found`)
    return reply(200, {
      orderId: order.id,
      status: order.state.status,
      customerEmail: order.customerEmail,
      totalCents: order.totalCents,
    })
  }

  private getCustomerOrders(email: string): HttpResponse {
    const orders = [...this.db.orders.values()].filter((order) => order.customerEmail === email)
    const last = orders.at(-1)
    return reply(200, {
      orderCount: orders.length,
      totalSpentCents: orders
        .filter((order) => order.state.status !== 'cancelled')
        .reduce((sum, order) => sum + order.totalCents, 0),
      lastStatus: last === undefined ? null : last.state.status,
    })
  }

  private statusReply(order: OrderRow): HttpResponse {
    return reply(200, { orderId: order.id, status: order.state.status })
  }
}
