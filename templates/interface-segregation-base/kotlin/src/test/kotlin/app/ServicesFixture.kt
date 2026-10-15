package app

import shop.Ledger

class FakeServices {
    val ledger = Ledger()

    fun open() = openShop(ShopServices(ledger))
}
