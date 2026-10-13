package receipts

import pricing.discountsFor
import pricing.totalOf
import shop.Order

fun receiptFor(order: Order): String = buildList {
    for (line in order.lines) add("${line.quantity} x ${line.sku}: ${line.amount}")
    for (discount in discountsFor(order)) add("${discount.label}: -${discount.amount}")
    add("Total: ${totalOf(order)}")
}.joinToString("\n")
