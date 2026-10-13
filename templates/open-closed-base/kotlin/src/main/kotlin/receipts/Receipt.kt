package receipts

import pricing.BULK_DISCOUNT
import pricing.BULK_DISCOUNT_FROM
import pricing.MEMBER_DISCOUNT_PERCENT
import pricing.totalOf
import shop.Order
import shop.Tier

fun receiptFor(order: Order): String {
    val subtotal = order.subtotal
    val lines = order.lines.map { "${it.quantity} x ${it.sku}: ${it.amount}" }.toMutableList()

    when (order.customer.tier) {
        Tier.MEMBER -> lines += "Member discount ($MEMBER_DISCOUNT_PERCENT%): -${subtotal.percent(MEMBER_DISCOUNT_PERCENT)}"
        Tier.REGULAR -> {}
    }

    if (subtotal.isAtLeast(BULK_DISCOUNT_FROM)) {
        lines += "Bulk discount: -$BULK_DISCOUNT"
    }

    lines += "Total: ${totalOf(order)}"
    return lines.joinToString("\n")
}
