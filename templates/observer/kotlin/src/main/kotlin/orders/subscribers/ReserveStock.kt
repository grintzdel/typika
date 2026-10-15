package orders.subscribers

import orders.OrderPlacedSubscriber
import services.Stock

fun reserveStock(stock: Stock) = OrderPlacedSubscriber { event -> stock.reserve(event.order.lines) }
