import { totalOf } from '../shop/order.js'

export const placeOrder = (order, { orders, events }) => {
  const orderId = orders.add(order)
  events.publish({ orderId, order, total: totalOf(order) })
  return orderId
}
