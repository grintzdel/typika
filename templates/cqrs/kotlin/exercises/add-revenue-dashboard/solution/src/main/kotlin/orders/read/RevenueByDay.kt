package orders.read

import orders.OrderCancelled
import orders.OrderEvent
import orders.OrderPaid
import orders.Projection
import kotlin.time.Instant

data class DailyRevenue(val day: String, val salesCents: Int, val refundsCents: Int)

private fun dayOf(instant: Instant) = instant.toString().take(10)

class RevenueByDay : Projection {
    private val days = mutableMapOf<String, DailyRevenue>()
    private val paidOrders = mutableMapOf<String, Int>()

    override fun apply(event: OrderEvent) {
        when (event) {
            is OrderPaid -> {
                paidOrders[event.orderId] = event.totalCents
                add(dayOf(event.occurredAt), salesCents = event.totalCents, refundsCents = 0)
            }
            is OrderCancelled -> {
                val paidCents = paidOrders[event.orderId] ?: return
                add(dayOf(event.occurredAt), salesCents = 0, refundsCents = paidCents)
            }
            else -> {}
        }
    }

    fun all() = days.values.sortedBy { it.day }

    private fun add(day: String, salesCents: Int, refundsCents: Int) {
        val current = days[day] ?: DailyRevenue(day, 0, 0)
        days[day] = current.copy(
            salesCents = current.salesCents + salesCents,
            refundsCents = current.refundsCents + refundsCents,
        )
    }
}
