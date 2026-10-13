package catalog

import shop.Money

class GiftCard(override val sku: Sku, override val name: String, override val price: Money) : Product
