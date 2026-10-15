package app

import orders.OrderId
import orders.OrderRepository
import orders.placeOrder
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

fun openShop(services: ShopServices): Shop = object : Shop {
    override fun placeOrder(order: Order) =
        placeOrder(order, services.orders, services.stock, services.notifier, services.analytics)
}
