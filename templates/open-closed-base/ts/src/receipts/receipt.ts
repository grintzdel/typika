import { BULK_DISCOUNT, BULK_DISCOUNT_FROM, MEMBER_DISCOUNT_PERCENT, totalOf } from '../pricing/price-order.ts'
import { formatMoney, percentOf } from '../shop/money.ts'
import { lineAmount, subtotalOf, type Order } from '../shop/order.ts'

export const receiptFor = (order: Order): string => {
  const subtotal = subtotalOf(order)
  const lines = order.lines.map((line) => `${line.quantity} x ${line.sku}: ${formatMoney(lineAmount(line))}`)

  switch (order.customer.tier) {
    case 'member':
      lines.push(
        `Member discount (${MEMBER_DISCOUNT_PERCENT}%): -${formatMoney(percentOf(subtotal, MEMBER_DISCOUNT_PERCENT))}`
      )
      break
    case 'regular':
      break
  }

  if (subtotal.cents >= BULK_DISCOUNT_FROM.cents) {
    lines.push(`Bulk discount: -${formatMoney(BULK_DISCOUNT)}`)
  }

  lines.push(`Total: ${formatMoney(totalOf(order))}`)
  return lines.join('\n')
}
