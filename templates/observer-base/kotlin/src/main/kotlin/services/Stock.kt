package services

import shop.OrderLine

fun interface Stock {
    fun reserve(lines: List<OrderLine>)
}
