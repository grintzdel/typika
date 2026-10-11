import type { OrderId } from '../orders/order-repository.ts'
import type { PricedOrder } from '../pricing/price-calculator.ts'
import { formatMoney } from '../shop/money.ts'

export class InvoiceFormatter {
  format(orderId: OrderId, priced: PricedOrder): string {
    return [
      `Invoice ${orderId}`,
      ...priced.lines.map((line) => `${line.quantity} x ${line.sku}: ${formatMoney(line.amount)}`),
      ...(priced.discount.cents > 0 ? [`Member discount: -${formatMoney(priced.discount)}`] : []),
      `Shipping: ${formatMoney(priced.shipping)}`,
      `Total: ${formatMoney(priced.total)}`,
    ].join('\n')
  }
}
