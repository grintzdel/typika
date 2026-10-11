import type { Stock } from '../../services/stock.ts'
import type { OrderPlacedSubscriber } from '../order-events.ts'

export const reserveStock =
  (stock: Stock): OrderPlacedSubscriber =>
  ({ order }) =>
    stock.reserve(order.lines)
