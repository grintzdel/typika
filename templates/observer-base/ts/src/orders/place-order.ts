import type { Analytics } from '../services/analytics.ts'
import type { Notifier } from '../services/notifier.ts'
import type { Stock } from '../services/stock.ts'
import { formatMoney } from '../shop/money.ts'
import { totalOf, type Order } from '../shop/order.ts'
import type { OrderId, OrderRepository } from './order-repository.ts'

export const placeOrder = (
  order: Order,
  orders: OrderRepository,
  stock: Stock,
  notifier: Notifier,
  analytics: Analytics
): OrderId => {
  const orderId = orders.add(order)
  const total = totalOf(order)

  stock.reserve(order.lines)
  notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(total)}`)
  analytics.track('order_placed', { orderId, totalCents: total.cents })

  return orderId
}
