import { formatMoney } from '../../shop/money.js'

export const sendConfirmation =
  (notifier) =>
  ({ orderId, order, total }) =>
    notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(total)}`)
