import { discountsFor } from '../pricing/discount-rules.ts'
import { totalOf } from '../pricing/price-order.ts'
import { formatMoney } from '../shop/money.ts'
import { lineAmount, type Order } from '../shop/order.ts'

export const receiptFor = (order: Order): string =>
  [
    ...order.lines.map((line) => `${line.quantity} x ${line.sku}: ${formatMoney(lineAmount(line))}`),
    ...discountsFor(order).map((discount) => `${discount.label}: -${formatMoney(discount.amount)}`),
    `Total: ${formatMoney(totalOf(order))}`,
  ].join('\n')
