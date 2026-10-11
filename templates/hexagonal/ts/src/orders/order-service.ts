import { addMoney, ZERO } from '../shop/money.ts'
import {
  cancel,
  createOrder,
  deliver,
  ensurePayable,
  markPaid,
  OrderNotFoundError,
  PaymentDeclinedError,
  ship,
  statusOf,
  type Order,
  type OrderId,
  type OrderRequest,
} from './domain/order.ts'
import type {
  Clock,
  CustomerHistory,
  Notifier,
  OrderEventPublisher,
  OrderRepository,
  OrderUseCases,
  PaymentGateway,
} from './ports.ts'

export type OrderServiceDependencies = {
  readonly orders: OrderRepository
  readonly payments: PaymentGateway
  readonly notifier: Notifier
  readonly events: OrderEventPublisher
  readonly clock: Clock
}

export class OrderService implements OrderUseCases {
  private readonly orders: OrderRepository
  private readonly payments: PaymentGateway
  private readonly notifier: Notifier
  private readonly events: OrderEventPublisher
  private readonly clock: Clock

  constructor({ orders, payments, notifier, events, clock }: OrderServiceDependencies) {
    this.orders = orders
    this.payments = payments
    this.notifier = notifier
    this.events = events
    this.clock = clock
  }

  placeOrder(request: OrderRequest): Order {
    const order = this.orders.add(createOrder(request, this.clock.now()))
    this.events.publish({ type: 'OrderPlaced', order })
    this.notifier.notify({ kind: 'order-confirmed', order })
    return order
  }

  payOrder(id: OrderId, cardToken: string): Order {
    const order = this.findOrder(id)
    ensurePayable(order)
    const charge = this.payments.charge(order.total, cardToken)
    if (charge.status === 'declined') throw new PaymentDeclinedError(charge.reason)

    const paid = markPaid(order, charge.paymentId)
    this.orders.update(paid)
    this.events.publish({ type: 'OrderPaid', order: paid })
    return paid
  }

  shipOrder(id: OrderId): Order {
    const shipped = ship(this.findOrder(id))
    this.orders.update(shipped)
    this.events.publish({ type: 'OrderShipped', order: shipped })
    this.notifier.notify({ kind: 'order-shipped', order: shipped })
    return shipped
  }

  deliverOrder(id: OrderId): Order {
    const delivered = deliver(this.findOrder(id), this.clock.now())
    this.orders.update(delivered)
    this.events.publish({ type: 'OrderDelivered', order: delivered })
    return delivered
  }

  cancelOrder(id: OrderId, reason: string): Order {
    const cancelled = cancel(this.findOrder(id))
    if (cancelled.chargeId !== null) this.payments.refund(cancelled.chargeId)
    this.orders.update(cancelled)
    this.events.publish({ type: 'OrderCancelled', order: cancelled })
    this.notifier.notify({ kind: 'order-cancelled', order: cancelled, reason })
    return cancelled
  }

  findOrder(id: OrderId): Order {
    const order = this.orders.find(id)
    if (order === undefined) throw new OrderNotFoundError(`Order ${id} not found`)
    return order
  }

  customerHistory(email: string): CustomerHistory {
    const orders = this.orders.findByCustomer(email)
    const last = orders.at(-1)
    return {
      orderCount: orders.length,
      totalSpent: orders.filter((order) => !order.isCancelled).reduce((sum, order) => addMoney(sum, order.total), ZERO),
      lastStatus: last === undefined ? null : statusOf(last),
    }
  }
}
