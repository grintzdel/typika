package orders

import invoices.formatInvoice
import invoices.formatPdfInvoice
import pricing.priceOrder
import services.Notifier
import services.PdfWriter
import shop.Money
import shop.Order

data class PlacedOrder(val orderId: OrderId, val total: Money)

// #region tour:orchestrator
class OrderService(
    private val orders: OrderRepository,
    private val notifier: Notifier,
    private val pdf: PdfWriter,
) {
    fun placeOrder(order: Order): PlacedOrder {
        validateOrder(order)
        val priced = priceOrder(order)
        val orderId = orders.add(order)
        notifier.notify(order.customer.email, formatInvoice(orderId, priced))
        return PlacedOrder(orderId, priced.total)
    }

    fun downloadInvoice(orderId: OrderId): ByteArray {
        val order = requireNotNull(orders.find(orderId)) { "Unknown order $orderId" }
        return pdf.write(formatPdfInvoice(orderId, priceOrder(order)))
    }
}
// #endregion
