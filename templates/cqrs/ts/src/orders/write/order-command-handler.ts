import type { CardProcessor } from '../../infrastructure/card-processor.ts'
import type { FakeBroker } from '../../infrastructure/fake-broker.ts'
import type { InMemoryDatabase, OrderRow } from '../../infrastructure/in-memory-database.ts'
import type { ManualClock } from '../../infrastructure/manual-clock.ts'
import type { SmtpMailer } from '../../infrastructure/smtp-mailer.ts'
import { formatMoney, money } from '../../shop/money.ts'
import type { OrderEvent, Projection } from '../order-events.ts'
import type { CommandResult, OrderCommand, PlaceOrder } from './order-commands.ts'

export type OrderCommandHandlerDependencies = {
  readonly db: InMemoryDatabase
  readonly cards: CardProcessor
  readonly broker: FakeBroker
  readonly mailer: SmtpMailer
  readonly clock: ManualClock
  readonly projections: readonly Projection[]
}

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0

const accepted = (orderId: string): CommandResult => ({ accepted: true, orderId })
const invalid = (reason: string): CommandResult => ({ accepted: false, rejection: 'invalid', reason })
const conflict = (reason: string): CommandResult => ({ accepted: false, rejection: 'conflict', reason })

export class OrderCommandHandler {
  private readonly db: InMemoryDatabase
  private readonly cards: CardProcessor
  private readonly broker: FakeBroker
  private readonly mailer: SmtpMailer
  private readonly clock: ManualClock
  private readonly projections: readonly Projection[]

  constructor({ db, cards, broker, mailer, clock, projections }: OrderCommandHandlerDependencies) {
    this.db = db
    this.cards = cards
    this.broker = broker
    this.mailer = mailer
    this.clock = clock
    this.projections = projections
  }

  execute(command: OrderCommand): CommandResult {
    if (command.type === 'PlaceOrder') return this.placeOrder(command)
    const order = this.db.orders.get(command.orderId)
    if (order === undefined) {
      return { accepted: false, rejection: 'not-found', reason: `Order ${command.orderId} not found` }
    }
    switch (command.type) {
      case 'PayOrder':
        return this.payOrder(order, command.cardToken)
      case 'ShipOrder':
        return this.shipOrder(order)
      case 'DeliverOrder':
        return this.deliverOrder(order)
      case 'CancelOrder':
        return this.cancelOrder(order, command.reason)
    }
  }

  private placeOrder({ customer, lines }: PlaceOrder): CommandResult {
    if (customer.name === '') return invalid('A customer name is required')
    if (!customer.email.includes('@')) return invalid('A valid customer email is required')
    if (lines.length === 0) return invalid('An order needs at least one line')
    for (const line of lines) {
      if (line.sku === '') return invalid('Each line needs a sku')
      if (!isPositiveInteger(line.unitPriceCents) || !isPositiveInteger(line.quantity)) {
        return invalid(`Line ${line.sku} needs a positive whole price and quantity`)
      }
    }

    const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
    const order: OrderRow = {
      id: this.db.nextOrderId(),
      customerEmail: customer.email,
      customerName: customer.name,
      lines: [...lines],
      totalCents,
      placedAt: this.clock.now(),
      chargeId: null,
      deliveredAt: null,
      isPaid: false,
      isShipped: false,
      isDelivered: false,
      isCancelled: false,
    }
    this.db.orders.set(order.id, order)
    this.record({
      type: 'OrderPlaced',
      orderId: order.id,
      customerEmail: order.customerEmail,
      totalCents,
      occurredAt: order.placedAt,
    })
    this.mailer.send({
      to: order.customerEmail,
      subject: `Order ${order.id} confirmed`,
      body: `Hello ${order.customerName}, we received your order of ${formatMoney(money(totalCents))}.`,
    })
    return accepted(order.id)
  }

  private payOrder(order: OrderRow, cardToken: string): CommandResult {
    if (order.isCancelled) return conflict(`Order ${order.id} is cancelled`)
    if (order.isPaid) return conflict(`Order ${order.id} is already paid`)

    const charge = this.cards.charge(cardToken, order.totalCents)
    if (!charge.approved) return { accepted: false, rejection: 'payment-declined', reason: charge.reason }
    order.isPaid = true
    order.chargeId = charge.chargeId
    this.record({ type: 'OrderPaid', orderId: order.id, totalCents: order.totalCents, occurredAt: this.clock.now() })
    return accepted(order.id)
  }

  private shipOrder(order: OrderRow): CommandResult {
    if (order.isCancelled) return conflict(`Order ${order.id} is cancelled`)
    if (!order.isPaid) return conflict(`Order ${order.id} is not paid`)
    if (order.isShipped) return conflict(`Order ${order.id} has already shipped`)

    order.isShipped = true
    this.record({ type: 'OrderShipped', orderId: order.id, occurredAt: this.clock.now() })
    this.mailer.send({
      to: order.customerEmail,
      subject: `Order ${order.id} shipped`,
      body: `Hello ${order.customerName}, your order is on its way.`,
    })
    return accepted(order.id)
  }

  private deliverOrder(order: OrderRow): CommandResult {
    if (!order.isShipped || order.isDelivered) return conflict(`Order ${order.id} is not on its way`)

    order.isDelivered = true
    order.deliveredAt = this.clock.now()
    this.record({ type: 'OrderDelivered', orderId: order.id, occurredAt: order.deliveredAt })
    return accepted(order.id)
  }

  private cancelOrder(order: OrderRow, reason: string): CommandResult {
    if (order.isShipped) return conflict(`Order ${order.id} has already shipped`)
    if (order.isCancelled) return conflict(`Order ${order.id} is already cancelled`)

    if (order.isPaid && order.chargeId !== null) this.cards.refund(order.chargeId)
    order.isCancelled = true
    this.record({ type: 'OrderCancelled', orderId: order.id, occurredAt: this.clock.now() })
    this.mailer.send({
      to: order.customerEmail,
      subject: `Order ${order.id} cancelled`,
      body: `Hello ${order.customerName}, your order was cancelled: ${reason}.`,
    })
    return accepted(order.id)
  }

  // #region tour:record
  private record(event: OrderEvent): void {
    for (const projection of this.projections) projection.apply(event)
    const { type, occurredAt, ...payload } = event
    this.broker.publish(type, payload)
  }
  // #endregion
}
