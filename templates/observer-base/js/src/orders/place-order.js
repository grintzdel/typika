import { formatMoney } from '../shop/money.js'
import { totalOf } from '../shop/order.js'

export const placeOrder = (order, { orders, stock, notifier, analytics }) => {
  const orderId = orders.add(order)
  const total = totalOf(order)

  stock.reserve(order.lines)
  notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(total)}`)
  analytics.track('order_placed', { orderId, totalCents: total.cents })

  return orderId
}
