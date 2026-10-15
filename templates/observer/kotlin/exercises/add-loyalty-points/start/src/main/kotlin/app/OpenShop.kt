package app

import orders.OrderId
import orders.OrderRepository
import orders.placeOrder
import services.Analytics
import services.LoyaltyProgram
import services.Notifier
import services.Stock
import shop.Order

class ShopServices(
    val orders: OrderRepository,
    val stock: Stock,
    val notifier: Notifier,
    val analytics: Analytics,
    val loyalty: LoyaltyProgram,
)

interface Shop {
    fun placeOrder(order: Order): OrderId

    fun startLoyaltyCampaign(): () -> Unit
}

fun openShop(services: ShopServices): Shop = object : Shop {
    override fun placeOrder(order: Order) =
        placeOrder(order, services.orders, services.stock, services.notifier, services.analytics)

    override fun startLoyaltyCampaign(): () -> Unit = TODO("Start a loyalty campaign, and return a function that ends it")
}
