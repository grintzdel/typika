import { formatMoney } from '../shop/money.ts'
import { totalOf, type Order } from '../shop/order.ts'
import type { Notifier } from './notifier.ts'
import type { OrderId, OrderRepository } from './order-repository.ts'

export type CheckoutDependencies = {
  readonly orders: OrderRepository
  readonly notifier: Notifier
}

// #region tour:inject
export class CheckoutService {
  private readonly orders: OrderRepository
  private readonly notifier: Notifier

  constructor({ orders, notifier }: CheckoutDependencies) {
    this.orders = orders
    this.notifier = notifier
  }

  placeOrder(order: Order): OrderId {
    const orderId = this.orders.add(order)
    this.notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(totalOf(order))}`)
    return orderId
  }

  findOrder(orderId: OrderId): Order | undefined {
    return this.orders.find(orderId)
  }
}
// #endregion
