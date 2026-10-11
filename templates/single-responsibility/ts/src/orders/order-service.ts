import { InvoiceFormatter } from '../invoices/invoice-formatter.ts'
import { PriceCalculator } from '../pricing/price-calculator.ts'
import type { Notifier } from '../services/notifier.ts'
import type { Money } from '../shop/money.ts'
import type { Order } from '../shop/order.ts'
import type { OrderId, OrderRepository } from './order-repository.ts'
import { OrderValidator } from './order-validator.ts'

export type OrderServices = {
  readonly orders: OrderRepository
  readonly notifier: Notifier
}

export type PlacedOrder = {
  readonly orderId: OrderId
  readonly total: Money
}

// #region tour:orchestrator
export class OrderService {
  private readonly validator = new OrderValidator()
  private readonly calculator = new PriceCalculator()
  private readonly formatter = new InvoiceFormatter()
  private readonly orders: OrderRepository
  private readonly notifier: Notifier

  constructor({ orders, notifier }: OrderServices) {
    this.orders = orders
    this.notifier = notifier
  }

  placeOrder(order: Order): PlacedOrder {
    this.validator.validate(order)
    const priced = this.calculator.price(order)
    const orderId = this.orders.add(order)
    this.notifier.notify(order.customer.email, this.formatter.format(orderId, priced))
    return { orderId, total: priced.total }
  }
}
// #endregion
