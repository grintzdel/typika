package invoices

import orders.OrderId
import pricing.PricedOrder
import shop.Money

fun formatInvoice(orderId: OrderId, priced: PricedOrder): String = buildList {
    add("Invoice $orderId")
    for (line in priced.lines) add("${line.quantity} x ${line.sku}: ${line.amount}")
    if (priced.discount != Money.ZERO) add("Member discount: -${priced.discount}")
    add("Shipping: ${priced.shipping}")
    add("Total: ${priced.total}")
}.joinToString("\n")
