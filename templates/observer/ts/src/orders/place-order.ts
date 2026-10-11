import { totalOf, type Order } from '../shop/order.ts'
import type { OrderEvents } from './order-events.ts'
import type { OrderId, OrderRepository } from './order-repository.ts'

export const placeOrder = (order: Order, orders: OrderRepository, events: OrderEvents): OrderId => {
  const orderId = orders.add(order)
  events.publish({ orderId, order, total: totalOf(order) })
  return orderId
}
