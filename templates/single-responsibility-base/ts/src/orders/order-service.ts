import type { Notifier } from '../services/notifier.ts'
import {
  addMoney,
  formatMoney,
  money,
  multiplyMoney,
  percentOf,
  subtractMoney,
  ZERO,
  type Money,
} from '../shop/money.ts'
import type { Order } from '../shop/order.ts'
import { InvalidOrderError } from './invalid-order-error.ts'
import type { OrderId, OrderRepository } from './order-repository.ts'

export type OrderServices = {
  readonly orders: OrderRepository
  readonly notifier: Notifier
}

export type PlacedOrder = {
  readonly orderId: OrderId
  readonly total: Money
}

const MEMBER_DISCOUNT_PERCENT = 10
const FREE_SHIPPING_FROM = money(5000)
const SHIPPING_FEE = money(490)

export class OrderService {
  private readonly orders: OrderRepository
  private readonly notifier: Notifier

  constructor({ orders, notifier }: OrderServices) {
    this.orders = orders
    this.notifier = notifier
  }

  placeOrder(order: Order): PlacedOrder {
    if (order.lines.length === 0) throw new InvalidOrderError('An order needs at least one line')
    for (const line of order.lines) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new InvalidOrderError(`Invalid quantity for ${line.sku}: ${line.quantity}`)
      }
    }
    if (!order.customer.email.includes('@')) {
      throw new InvalidOrderError(`Invalid email address: ${order.customer.email}`)
    }

    const invoice: string[] = []
    let subtotal = ZERO
    for (const line of order.lines) {
      const amount = multiplyMoney(line.unitPrice, line.quantity)
      subtotal = addMoney(subtotal, amount)
      invoice.push(`${line.quantity} x ${line.sku}: ${formatMoney(amount)}`)
    }

    let total = subtotal
    if (order.customer.tier === 'member') {
      const discount = percentOf(subtotal, MEMBER_DISCOUNT_PERCENT)
      total = subtractMoney(total, discount)
      invoice.push(`Member discount: -${formatMoney(discount)}`)
    }

    const shipping = total.cents >= FREE_SHIPPING_FROM.cents ? ZERO : SHIPPING_FEE
    total = addMoney(total, shipping)
    invoice.push(`Shipping: ${formatMoney(shipping)}`)
    invoice.push(`Total: ${formatMoney(total)}`)

    const orderId = this.orders.add(order)
    this.notifier.notify(order.customer.email, [`Invoice ${orderId}`, ...invoice].join('\n'))

    return { orderId, total }
  }
}
