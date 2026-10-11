import type { LoyaltyProgram } from '../../services/loyalty-program.ts'
import type { OrderPlacedSubscriber } from '../order-events.ts'

export const awardLoyaltyPoints =
  (loyalty: LoyaltyProgram): OrderPlacedSubscriber =>
  ({ order, total }) => {
    if (order.customer.tier !== 'member') return
    loyalty.award(order.customer.email, Math.floor(total.cents / 100))
  }
