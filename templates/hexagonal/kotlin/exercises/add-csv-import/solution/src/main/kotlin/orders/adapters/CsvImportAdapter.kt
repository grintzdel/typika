package orders.adapters

import orders.OrderUseCases
import orders.domain.Customer
import orders.domain.InvalidOrderException
import orders.domain.OrderId
import orders.domain.OrderLineRequest
import orders.domain.OrderRequest

data class ImportReport(val imported: List<OrderId>, val rejectedLines: List<Int>)

class CsvImportAdapter(private val orders: OrderUseCases) {
    fun importOrders(csv: String): ImportReport {
        val imported = mutableListOf<OrderId>()
        val rejectedLines = mutableListOf<Int>()
        csv.trim().lines().drop(1).forEachIndexed { index, row ->
            val (email, name, sku, unitPriceCents, quantity) = row.split(",") + List(5) { "" }
            val line = OrderLineRequest(sku, unitPriceCents.toIntOrNull() ?: 0, quantity.toIntOrNull() ?: 0)
            try {
                imported += orders.placeOrder(OrderRequest(Customer(name, email), listOf(line))).id
            } catch (error: InvalidOrderException) {
                rejectedLines += index + 2
            }
        }
        return ImportReport(imported, rejectedLines)
    }
}
