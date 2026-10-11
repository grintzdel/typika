import type { OrderId, OrderRepository } from './orders/order-repository.ts'
import { placeOrder } from './orders/place-order.ts'
import type { Analytics } from './services/analytics.ts'
import type { Notifier } from './services/notifier.ts'
import type { Stock } from './services/stock.ts'
import type { Order } from './shop/order.ts'

export type ShopServices = {
  readonly orders: OrderRepository
  readonly stock: Stock
  readonly notifier: Notifier
  readonly analytics: Analytics
}

export type Shop = {
  readonly placeOrder: (order: Order) => OrderId
}

export const openShop = ({ orders, stock, notifier, analytics }: ShopServices): Shop => ({
  placeOrder: (order) => placeOrder(order, orders, stock, notifier, analytics),
})
