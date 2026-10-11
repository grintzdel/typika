import type { Notifier } from '../../services/notifier.ts'
import { formatMoney } from '../../shop/money.ts'
import type { OrderPlacedSubscriber } from '../order-events.ts'

export const sendConfirmation =
  (notifier: Notifier): OrderPlacedSubscriber =>
  ({ orderId, order, total }) =>
    notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(total)}`)
