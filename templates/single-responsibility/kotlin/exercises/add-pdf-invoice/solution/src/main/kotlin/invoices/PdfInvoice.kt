package invoices

import orders.OrderId
import pricing.PricedOrder
import services.PdfDocument
import services.PdfRow
import shop.Money

fun formatPdfInvoice(orderId: OrderId, priced: PricedOrder) = PdfDocument(
    title = "Invoice $orderId",
    rows = buildList {
        for (line in priced.lines) add(PdfRow("${line.quantity} x ${line.sku}", line.amount.toString()))
        if (priced.discount != Money.ZERO) add(PdfRow("Member discount", "-${priced.discount}"))
        add(PdfRow("Shipping", priced.shipping.toString()))
    },
    total = priced.total.toString(),
)
