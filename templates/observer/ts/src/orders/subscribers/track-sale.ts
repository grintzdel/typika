import type { Analytics } from '../../services/analytics.ts'
import type { OrderPlacedSubscriber } from '../order-events.ts'

export const trackSale =
  (analytics: Analytics): OrderPlacedSubscriber =>
  ({ orderId, total }) =>
    analytics.track('order_placed', { orderId, totalCents: total.cents })
