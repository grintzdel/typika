import type { OrderId } from '../orders/order-repository.ts'
import type { PricedOrder } from '../pricing/price-calculator.ts'
import type { PdfDocument } from '../services/pdf-writer.ts'
import { formatMoney } from '../shop/money.ts'

export class PdfInvoiceFormatter {
  format(orderId: OrderId, priced: PricedOrder): PdfDocument {
    return {
      title: `Invoice ${orderId}`,
      rows: [
        ...priced.lines.map((line) => ({ label: `${line.quantity} x ${line.sku}`, amount: formatMoney(line.amount) })),
        ...(priced.discount.cents > 0 ? [{ label: 'Member discount', amount: `-${formatMoney(priced.discount)}` }] : []),
        { label: 'Shipping', amount: formatMoney(priced.shipping) },
      ],
      total: formatMoney(priced.total),
    }
  }
}
