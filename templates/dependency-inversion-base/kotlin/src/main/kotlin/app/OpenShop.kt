package app

import checkout.CheckoutService

class Shop(val checkout: CheckoutService)

fun openShop() = Shop(checkout = CheckoutService())
