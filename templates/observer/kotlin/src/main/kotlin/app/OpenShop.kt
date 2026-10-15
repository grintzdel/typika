package app

import orders.OrderEvents
import orders.OrderId
import orders.OrderRepository
import orders.placeOrder
import orders.subscribers.reserveStock
import orders.subscribers.sendConfirmation
import orders.subscribers.trackSale
import services.Analytics
import services.Notifier
import services.Stock
import shop.Order

class ShopServices(
    val orders: OrderRepository,
    val stock: Stock,
    val notifier: Notifier,
    val analytics: Analytics,
)

interface Shop {
    fun placeOrder(order: Order): OrderId
}

private fun reportSubscriberError(error: Exception) = println("An order subscriber failed: $error")

// #region tour:wiring
fun openShop(services: ShopServices): Shop {
    val events = OrderEvents(::reportSubscriberError)
    events.subscribe(reserveStock(services.stock))
    events.subscribe(sendConfirmation(services.notifier))
    events.subscribe(trackSale(services.analytics))

    return object : Shop {
        override fun placeOrder(order: Order) = placeOrder(order, services.orders, events)
    }
}
// #endregion
